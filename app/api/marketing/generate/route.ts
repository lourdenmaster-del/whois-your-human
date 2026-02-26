import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { pickBackgroundSource } from "@/lib/ligs-studio-utils";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import type { MarketingAssets } from "@/lib/marketing/types";
import { parseMarketingGenerateRequest } from "./request-schema";
import { buildMinimalVoiceProfile } from "@/lib/marketing/minimal-profile";
import {
  getIdempotentResult,
  setIdempotentResult,
  isValidIdempotencyKey,
} from "@/lib/idempotency-store";
import { LigsArchetypeEnum } from "@/src/ligs/voice/schema";
import { killSwitchResponse } from "@/lib/api-kill-switch";

function getBaseUrl(req: Request): string {
  try {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    const v = process.env.VERCEL_URL;
    if (v) return `https://${v}`;
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }
}

export async function POST(req: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;
  const requestId = crypto.randomUUID();
  const ALLOW_EXTERNAL_WRITES = process.env.ALLOW_EXTERNAL_WRITES === "true";
  const dryRun = !ALLOW_EXTERNAL_WRITES;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "MARKETING_REQUEST_INVALID", message: "Invalid JSON body", requestId },
        { status: 400 }
      );
    }

    const parsed = parseMarketingGenerateRequest(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error, message: "Invalid request", issues: parsed.issues, requestId },
        { status: 400 }
      );
    }

    const { primary_archetype, variationKey, contrastDelta, idempotencyKey } = parsed.data;

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
        descriptor: unknown;
        assets: MarketingAssets;
        requestId: string;
        dryRun: boolean;
      }>("marketing-generate", idempotencyKey, { requestId });
      if (cached) {
        log("info", "idempotency_hit", { requestId, route: "marketing-generate" });
        return NextResponse.json({
          ...cached,
          requestId,
        });
      }
    }

    const descriptor = getMarketingDescriptor(primary_archetype, { contrastDelta });
    const assets: MarketingAssets = {};

    if (!dryRun) {
      const delta = Math.max(0, Math.min(1, contrastDelta ?? 0.15));
      const isKnownArchetype = LigsArchetypeEnum.safeParse(primary_archetype).success;
      const profileArchetype = isKnownArchetype
        ? (primary_archetype as string)
        : "Stabiliora";
      const vkForPrompt = isKnownArchetype ? `cd${delta}` : `raw_${primary_archetype}_cd${delta}`;
      const vk = variationKey ? `${vkForPrompt}_${variationKey}` : vkForPrompt;
      const profile = buildMinimalVoiceProfile(
        profileArchetype as import("@/src/ligs/voice/schema").LigsArchetype
      );
      const baseUrl = getBaseUrl(req);

      // Use cached path: POST /api/image/generate (LRU + cache keying applies)
      const logoResult = await fetchImageGenerate(baseUrl, {
        profile,
        purpose: "marketing_logo_mark",
        image: { aspectRatio: "1:1", size: "1024", count: 1 },
        variationKey: vk,
        archetype: profileArchetype,
      });
      if (logoResult) assets.logoMark = logoResult;

      const bgResult = await fetchImageGenerate(baseUrl, {
        profile,
        purpose: "marketing_background",
        image: { aspectRatio: "16:9", size: "1024", count: 1 },
        variationKey: vk,
        archetype: profileArchetype,
      });
      if (bgResult) assets.marketingBackground = bgResult;
    }

    const result = { descriptor, assets, requestId, dryRun };

    if (isValidIdempotencyKey(idempotencyKey)) {
      await setIdempotentResult(
        "marketing-generate",
        idempotencyKey,
        {
          ...result,
          allowExternalWrites: ALLOW_EXTERNAL_WRITES,
          timestamp: Date.now(),
        },
        { requestId }
      );
    }

    log("info", "marketing_generate", {
      requestId,
      primary_archetype,
      dryRun,
      hasLogo: !!assets.logoMark,
      hasBackground: !!assets.marketingBackground,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("error", "marketing_generate_failed", { requestId, error: message });
    return NextResponse.json(
      { error: "MARKETING_GENERATE_FAILED", message, requestId },
      { status: 500 }
    );
  }
}

async function fetchImageGenerate(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<{ url?: string; b64?: string } | null> {
  try {
    const res = await fetch(`${baseUrl}/api/image/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) return null;
    const images = data.images as unknown[] | undefined;
    const first = images?.[0];
    const normalized = pickBackgroundSource(
      first != null ? { images: [first] } : null
    );
    return normalized;
  } catch {
    return null;
  }
}
