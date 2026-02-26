import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import {
  parseGenerateImageRequest,
} from "@/src/ligs/image/api/generate-request-schema";
import {
  buildImagePromptSpec,
  validateImagePromptSpec,
  computeImageCacheKey,
  getCachedResult,
  setCachedResult,
} from "@/src/ligs/image";
import { sanitizePromptForDenylist } from "@/src/ligs/image/denylist";
import { generateImagesViaProvider, PROVIDER_NAME } from "@/src/ligs/image/provider";
import {
  getIdempotentResult,
  setIdempotentResult,
  isValidIdempotencyKey,
} from "@/lib/idempotency-store";
import { killSwitchResponse } from "@/lib/api-kill-switch";

export async function POST(req: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;
  console.log("SERVER KEY PREFIX:", (process.env.OPENAI_API_KEY || "").slice(0, 12));
  const requestId = crypto.randomUUID();

  /**
   * Server-only flag: no client control.
   * When false, we return a DRY_RUN payload without calling the image provider.
   */
  const ALLOW_EXTERNAL_WRITES = process.env.ALLOW_EXTERNAL_WRITES === "true";
  const dryRun = !ALLOW_EXTERNAL_WRITES;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "IMAGE_REQUEST_INVALID", message: "Invalid JSON body", requestId },
        { status: 400 }
      );
    }

    const parsed = parseGenerateImageRequest(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.errorType,
          message: parsed.message,
          issues: parsed.issues,
          requestId,
        },
        { status: 400 }
      );
    }

    const { profile, archetype, image, purpose, variationKey, idempotencyKey } = parsed.data;
    const archetypeValue = archetype ?? profile.ligs.primary_archetype;

    if (!dryRun && !isValidIdempotencyKey(idempotencyKey)) {
      log("warn", "idempotency_key_required", { requestId });
      return NextResponse.json(
        {
          error: "IDEMPOTENCY_KEY_REQUIRED",
          message: "idempotencyKey (UUID) is required when making live image calls. Provide it in the request body to prevent duplicate spend.",
          requestId,
        },
        { status: 400 }
      );
    }

    // Idempotency: return cached result if same key completed previously
    if (isValidIdempotencyKey(idempotencyKey)) {
      const cached = await getIdempotentResult<{
        requestId: string;
        images: unknown[];
        spec: unknown;
        providerPrompt?: { positive: string; negative: string; full: string };
        validation: unknown;
        dryRun: boolean;
        providerUsed: string | null;
        cacheHit: boolean;
      }>("image-generate", idempotencyKey, { requestId });
      if (cached) {
        log("info", "idempotency_hit", { requestId, route: "image-generate" });
        return NextResponse.json({
          ...cached,
          requestId,
          idempotencyHit: true,
          cacheHit: true, // cached result = no provider call
        });
      }
    }

    const cacheKey = computeImageCacheKey({
      profileId: profile.id,
      profileVersion: profile.version,
      purpose,
      aspectRatio: image.aspectRatio,
      size: image.size,
      count: image.count,
      archetype: archetypeValue,
      variationKey: variationKey ?? "0",
    });

    const cached = getCachedResult(cacheKey);
    if (cached && !dryRun) {
      const response = {
        requestId,
        images: cached.images,
        spec: cached.spec,
        providerPrompt: (cached as { providerPrompt?: { positive: string; negative: string; full: string } }).providerPrompt,
        validation: cached.validation,
        dryRun: false,
        providerUsed: PROVIDER_NAME,
        cacheHit: true,
      };
      if (isValidIdempotencyKey(idempotencyKey)) {
        await setIdempotentResult(
          "image-generate",
          idempotencyKey,
          {
            ...response,
            allowExternalWrites: true,
            timestamp: Date.now(),
          },
          { requestId }
        );
      }
      log("info", "image_generate", {
        requestId,
        profileId: profile.id,
        purpose,
        archetype: archetypeValue,
        aspectRatio: image.aspectRatio,
        size: image.size,
        count: image.count,
        score: cached.validation.score,
        pass: cached.validation.pass,
        dryRun: false,
        providerUsed: PROVIDER_NAME,
        cacheHit: true,
      });
      return NextResponse.json(response);
    }

    const spec = buildImagePromptSpec(profile, {
      purpose,
      archetype: archetype ?? undefined,
      aspectRatio: image.aspectRatio,
      size: image.size,
      count: image.count,
      variationKey,
    });

    const validation = validateImagePromptSpec(spec);
    if (!validation.pass) {
      log("warn", "image_spec_invalid", {
        requestId,
        profileId: profile.id,
        score: validation.score,
        issues: validation.issues.length,
      });
      return NextResponse.json(
        {
          error: "IMAGE_SPEC_INVALID",
          message: "Image prompt spec validation failed",
          issues: validation.issues,
          requestId,
        },
        { status: 400 }
      );
    }

    if (dryRun) {
      log("info", "image_generate", {
        requestId,
        profileId: profile.id,
        purpose,
        archetype: archetypeValue,
        aspectRatio: image.aspectRatio,
        size: image.size,
        count: image.count,
        score: validation.score,
        pass: validation.pass,
        dryRun: true,
        providerUsed: null,
        cacheHit: false,
      });
      return NextResponse.json({
        requestId,
        images: [],
        spec,
        validation: {
          pass: validation.pass,
          score: validation.score,
          issues: validation.issues,
        },
        dryRun: true,
        providerUsed: null,
        cacheHit: false,
      });
    }

    const positive = sanitizePromptForDenylist(spec.prompt.positive);
    const negative = spec.prompt.negative ?? "";
    const fullPrompt = negative ? `${positive} Avoid: ${negative}.` : positive;
    const full = fullPrompt.slice(0, 4000);

    const images = await generateImagesViaProvider({
      positive,
      negative,
      aspectRatio: image.aspectRatio,
      count: spec.output.count,
    });

    const result = {
      images,
      spec,
      /** Exact strings sent to provider (for keeper manifest). */
      providerPrompt: { positive, negative, full },
      validation: {
        pass: validation.pass,
        score: validation.score,
        issues: validation.issues,
      },
    };
    setCachedResult(cacheKey, result);

    if (isValidIdempotencyKey(idempotencyKey)) {
        await setIdempotentResult(
          "image-generate",
          idempotencyKey,
          {
            requestId,
            images: result.images,
            spec: result.spec,
            providerPrompt: result.providerPrompt,
            validation: result.validation,
            dryRun: false,
            providerUsed: PROVIDER_NAME,
            cacheHit: false,
            allowExternalWrites: true,
            timestamp: Date.now(),
          },
          { requestId }
        );
    }

    log("info", "image_generate", {
      requestId,
      profileId: profile.id,
      purpose,
      archetype: archetypeValue,
      aspectRatio: image.aspectRatio,
      size: image.size,
      count: image.count,
      score: validation.score,
      pass: validation.pass,
      dryRun: false,
      providerUsed: PROVIDER_NAME,
      cacheHit: false,
    });

    return NextResponse.json({
      requestId,
      images,
      spec,
      providerPrompt: result.providerPrompt,
      validation: result.validation,
      dryRun: false,
      providerUsed: PROVIDER_NAME,
      cacheHit: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("error", "image_generate_failed", { requestId, error: message });
    return NextResponse.json(
      { error: "IMAGE_GENERATE_FAILED", message, requestId },
      { status: 500 }
    );
  }
}
