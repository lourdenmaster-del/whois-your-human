import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { EngineResponse, ReportResponse } from "@/lib/api-types";
import type { BeautyProfileV1 } from "@/lib/beauty-profile-schema";
import {
  EVE_FILTER_SPEC,
  buildBeautyProfile,
  buildCondensedFullReport,
  extractArchetypeFromReport,
  buildArchetypeVoiceBlock,
  buildArchetypePhraseBankBlock,
} from "@/lib/eve-spec";
import {
  getPrimaryArchetypeFromSolarLongitude,
  resolveSecondaryArchetype,
  buildTriangulatedImagePrompt,
} from "@/src/ligs/image/triangulatePrompt";
import { LIGS_ARCHETYPES, FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";
import type { LigsArchetype } from "@/src/ligs/voice/schema";
import type { VectorZero } from "@/lib/vector-zero";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { loadBeautyProfileV1, saveBeautyProfileV1 } from "@/lib/beauty-profile-store";
import { SCHEMA_VERSION, getEngineVersion, buildRegistryForResolved } from "@/lib/beauty-profile-schema";
import { validateEngineBody } from "@/lib/validate-engine-body";
import { allowExternalWrites, isTestMode } from "@/lib/runtime-mode";
import {
  getIdempotentResult,
  setIdempotentResult,
  isValidIdempotencyKey,
  deriveIdempotencyKey,
} from "@/lib/idempotency-store";
import { saveImageToBlob, getImageUrlFromBlob } from "@/lib/report-store";
import { buildMinimalVoiceProfile } from "@/lib/marketing/minimal-profile";
import { pickBackgroundSource } from "@/lib/ligs-studio-utils";
import { buildOverlaySpecWithCopy, buildIdentityOverlaySpec } from "@/src/ligs/marketing";
import { createArchetypeGradientSvgBuffer } from "@/lib/marketing/gradient-background";
import { renderStaticCardOverlay, renderIdentityCardOverlay } from "@/lib/marketing/static-overlay";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import {
  saveKeeperManifest,
  IDENTITY_SPEC_VERSION,
  type KeeperManifest,
} from "@/lib/keeper-manifest";
import { killSwitchResponse } from "@/lib/api-kill-switch";
import { getSolarSeasonProfile } from "@/src/ligs/astronomy/solarSeason";
import {
  ENGINE_EXECUTION_DEFER_CONSUME_HEADER,
  extractExecutionKey,
  getEngineExecutionGrantViolation,
  consumeEngineExecutionGrant,
  isEngineExecutionGateEnforced,
} from "@/lib/engine-execution-grant";

const IMAGE_SLUGS = [
  "vector_zero_beauty_field",
  "light_signature_aesthetic_field",
  "final_beauty_field",
] as const;

const FALLBACK_PROMPT =
  "Abstract light field, structural grid, deep navy #050814 with violet #7A4FFF accents, scientific-mythic portal, no figures, no faces.";

export async function POST(req: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const mark = () => Date.now() - start;
  log("info", "request", { requestId, method: "POST", path: "/api/engine" });
  try {
    const body = await req.json();
    const validation = validateEngineBody(body);
    if (!validation.ok) {
      log("warn", "validation failed", { requestId, error: validation.error.message });
      return errorResponse(400, validation.error.message, requestId);
    }
    const { fullName, birthDate, birthTime, birthLocation, email, dryRun: bodyDryRun } = validation.value;
    const validated = validation.value as Record<string, unknown>;
    const derivedData = validated.birthContext ?? validated.astrology;
    const idempotencyKey = validated.idempotencyKey as string | undefined;
    const executionKey = extractExecutionKey(req, body as Record<string, unknown>);
    const willSpend = allowExternalWrites && bodyDryRun !== true;

    if (willSpend && !isValidIdempotencyKey(idempotencyKey)) {
      log("warn", "idempotency_key_required", { requestId });
      return errorResponse(
        400,
        "idempotencyKey (UUID) is required when making live E.V.E. and image calls. Provide it in the request body to prevent duplicate spend.",
        requestId
      );
    }

    // Idempotency: return cached full engine response if same key completed previously
    if (isValidIdempotencyKey(idempotencyKey)) {
      const cached = await getIdempotentResult<Record<string, unknown>>("engine", idempotencyKey, {
        requestId,
      });
      if (cached) {
        log("info", "idempotency_hit", { requestId, route: "engine" });
        const reportIdCached = cached.reportId as string | undefined;
        log("info", "assets_manifest", {
          requestId,
          reportId: reportIdCached ?? null,
          signatureImageUrls: (cached.imageUrls as string[] | undefined) ?? [],
          marketingBackgroundUrl: (cached.marketingBackgroundUrl as string) ?? null,
          logoMarkUrl: (cached.logoMarkUrl as string) ?? null,
          marketingCardUrl: (cached.marketingCardUrl as string) ?? null,
          shareCardUrl: (cached.shareCardUrl as string) ?? null,
          idempotencyHit: true,
        });
        const cylindersMeta = {
          llmCallsAttempted: 0,
          imageCallsAttempted: 0,
          allowExternalWrites,
          idempotencyHit: true,
          routesHit: ["engine"],
        };
        return successResponse(200, { ...cached, idempotencyHit: true, meta: cylindersMeta }, requestId);
      }
    }

    const grantErr = await getEngineExecutionGrantViolation(executionKey, {
      dryRun: bodyDryRun === true,
    });
    if (grantErr) {
      return errorResponse(403, grantErr, requestId);
    }

    const origin =
      process.env.VERCEL_URL != null
        ? `https://${process.env.VERCEL_URL}`
        : new URL(req.url).origin;
    const engineUrl = `${origin}/api/engine/generate`;
    log("info", "stage", { requestId, stage: "engine_request_start", durationMs: mark() });
    const tEngineStart = Date.now();
    const engineRes = await fetch(engineUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [ENGINE_EXECUTION_DEFER_CONSUME_HEADER]: "1",
      },
      body: JSON.stringify({
        fullName,
        birthDate,
        birthTime: birthTime ?? "",
        birthLocation,
        email,
        ...(derivedData != null && { birthContext: derivedData }),
        ...(bodyDryRun === true && { dryRun: true }),
        ...(idempotencyKey && { idempotencyKey }),
        ...(executionKey && { executionKey }),
      }),
    });
    const engineMs = Date.now() - tEngineStart;
    log("info", "stage", { requestId, stage: "engine_request_end", durationMs: mark() });

    const rawEngineResponseText = await engineRes.text();

    let engineData: EngineResponse;
    try {
      engineData = JSON.parse(rawEngineResponseText) as EngineResponse;
    } catch {
      log("error", "ENGINE_JSON_PARSE_FAILED", {
        requestId,
        rawResponsePreview: rawEngineResponseText.slice(0, 2000),
        engineStatus: engineRes.status,
      });
      return NextResponse.json(
        {
          error: "ENGINE_JSON_PARSE_FAILED",
          requestId,
          debug: {
            rawEngineResponse: rawEngineResponseText.slice(0, 8000),
            engineStatus: engineRes.status,
          },
        },
        { status: 502 }
      );
    }

    if (!engineRes.ok || engineData.error) {
      const status = engineRes.status >= 400 ? engineRes.status : 500;
      return errorResponse(
        status,
        engineData.error ?? "LIGS engine request failed",
        requestId
      );
    }

    const reportId = engineData.data?.reportId;
    const vectorZero = engineData.data?.vector_zero;

    if (!reportId) {
      log("warn", "engine did not return reportId", { requestId });
      return errorResponse(502, "ENGINE_MISSING_REPORT_ID", requestId);
    }

    // Do NOT overwrite full_report. engine/generate already saved it via saveReportAndConfirm.
    // Fetch the report as stored; E.V.E. requires full_report to be present.
    log("info", "report_fetch_before_eve", {
      requestId,
      reportId,
      note: "full_report must remain intact from engine/generate",
    });
    const reportUrl = `${origin}/api/report/${reportId}`;
    log("info", "stage", { requestId, stage: "report_fetch_start", durationMs: mark() });
    const tReportStart = Date.now();
    const reportRes = await fetch(reportUrl);
    const reportFetchMs = Date.now() - tReportStart;
    log("info", "stage", { requestId, stage: "report_fetch_end", durationMs: mark() });
    const reportJson = (await reportRes.json()) as
      | (ReportResponse & { error?: string })
      | { status: string; data: ReportResponse; error?: string };

    if (!reportRes.ok || (reportJson as { error?: string }).error) {
      const status = reportRes.status >= 400 ? reportRes.status : 502;
      return errorResponse(status, "REPORT_NOT_FOUND", requestId);
    }

    const reportData =
      (reportJson as { data?: ReportResponse }).data ?? (reportJson as ReportResponse);
    const fullReport = reportData.full_report ?? "";
    const emotionalSnippet = reportData.emotional_snippet ?? "";
    const vectorZeroFromReport = reportData.vector_zero ?? vectorZero;

    /** Canonical identity: compute before E.V.E. so prompt uses solar archetype, not extracted. */
    const derived = derivedData as Record<string, unknown> | undefined;
    const sunLonDeg = typeof derived?.sunLonDeg === "number" ? derived.sunLonDeg : 0;
    const lat = typeof derived?.lat === "number" ? derived.lat : 0;
    const utcTimestamp = typeof derived?.utcTimestamp === "string" ? derived.utcTimestamp : "";
    const sunCtx = derived?.sun as Record<string, unknown> | undefined;
    const twilightPhase = (typeof sunCtx?.twilightPhase === "string" ? sunCtx.twilightPhase : "day") as
      | "day"
      | "civil"
      | "nautical"
      | "astronomical"
      | "night";
    const solarProfile = { sunLonDeg, twilightPhase };
    const solarSeasonProfile = getSolarSeasonProfile({
      sunLonDeg,
      latitudeDeg: lat,
      date: utcTimestamp ? new Date(utcTimestamp) : new Date(),
      sunAltitudeDeg: typeof sunCtx?.sunAltitudeDeg === "number" ? sunCtx.sunAltitudeDeg : undefined,
      dayLengthMinutes: typeof sunCtx?.dayLengthMinutes === "number" ? sunCtx.dayLengthMinutes : undefined,
      twilightPhase,
    });
    const hasValidSunLon = typeof derived?.sunLonDeg === "number";
    const canonicalArchetype =
      hasValidSunLon && solarSeasonProfile?.archetype
        ? solarSeasonProfile.archetype
        : extractArchetypeFromReport(fullReport) ?? FALLBACK_PRIMARY_ARCHETYPE;

    const archetypeVoiceBlock = buildArchetypeVoiceBlock(canonicalArchetype);
    const phraseBankBlock = buildArchetypePhraseBankBlock(canonicalArchetype);

    if (!fullReport) {
      log("warn", "stored report has no full_report", { requestId });
      return errorResponse(502, "REPORT_MISSING_FULL_REPORT", requestId);
    }

    const engineDryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

    log("info", "stage", { requestId, stage: "beauty_filter_start", durationMs: mark() });
    const tBeautyStart = Date.now();
    let filterText: string;
    if (engineDryRun) {
      filterText = JSON.stringify({
        vector_zero: vectorZeroFromReport ?? {
          three_voice: { raw_signal: "Baseline.", custodian: "Default.", oracle: "Identity at rest." },
          beauty_baseline: { color_family: "warm-neutral", texture_bias: "smooth", shape_bias: "balanced", motion_bias: "steady" },
        },
        light_signature: { raw_signal: "Spectral pattern.", custodian: "Light vectors.", oracle: "Signature emerges." },
        archetype: { raw_signal: "Archetype.", custodian: "Core pattern.", oracle: "How it presents." },
        deviations: { raw_signal: "Drift.", custodian: "Under pressure.", oracle: "Where it bends." },
        corrective_vector: { raw_signal: "Return.", custodian: "To center.", oracle: "Stabilization." },
        imagery_prompts: {
          vector_zero_beauty_field: FALLBACK_PROMPT,
          light_signature_aesthetic_field: FALLBACK_PROMPT,
          final_beauty_field: FALLBACK_PROMPT,
        },
      });
      log("info", "E.V.E. DRY_RUN fixture used — zero OpenAI spend", { requestId });
    } else {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey) {
        log("warn", "OPENAI_API_KEY not set", { requestId });
        return errorResponse(
          500,
          "OPENAI_API_KEY not set. Set it in your environment (e.g. Vercel Project Settings → Environment Variables).",
          requestId
        );
      }
      const openai = new OpenAI({ apiKey });
      try {
        const eveFilterResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `${EVE_FILTER_SPEC}\n\nOutput valid JSON only. No prose, no markdown, no comments, no trailing commas. Use exactly the structure defined above.`,
          },
          {
            role: "user",
            content: `Extract the Beauty-Only Profile from this LIGS report. Output the full JSON structure per the spec (vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts).\n\n${archetypeVoiceBlock}\n\n${phraseBankBlock ? `\n${phraseBankBlock}\n\n` : ""}Full report:\n${fullReport.slice(0, 8000)}\n\nEmotional snippet: ${emotionalSnippet}\n\n${vectorZeroFromReport ? `Vector Zero (use this for vector_zero section):\n${JSON.stringify(vectorZeroFromReport)}` : ""}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });
        filterText = eveFilterResponse.choices[0]?.message?.content ?? "";
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("error", "E.V.E. model call failed", { requestId, message: msg });
        throw new Error(`E.V.E. model call failed: ${msg}`);
      }
    }
    const beautyFilterMs = Date.now() - tBeautyStart;
    log("info", "stage", { requestId, stage: "beauty_filter_end", durationMs: mark() });

    if (!filterText || typeof filterText !== "string") {
      log("warn", "E.V.E. filter did not return output", { requestId });
      return errorResponse(500, "BEAUTY_FILTER_EMPTY_OUTPUT", requestId);
    }

    let filterOutput: Record<string, unknown>;
    try {
      const raw = JSON.parse(filterText) as unknown;
      if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("E.V.E. response is not a JSON object");
      }
      const obj = raw as Record<string, unknown>;
      const required = ["vector_zero", "light_signature", "archetype", "deviations", "corrective_vector", "imagery_prompts"];
      const missing = required.filter((k) => !(k in obj));
      if (missing.length > 0) {
        throw new Error(`E.V.E. response missing required keys: ${missing.join(", ")}`);
      }
      filterOutput = obj;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", "E.V.E. invalid JSON or shape", { requestId, message: msg });
      throw new Error(`E.V.E. invalid JSON output: ${msg}`);
    }

    const beautyProfile = buildBeautyProfile(filterOutput, vectorZeroFromReport);

    const timings = {
      totalMs: mark(),
      engineMs,
      reportFetchMs,
      beautyFilterMs,
    };
    const imagePromptsUsed = [
      { slug: IMAGE_SLUGS[0], prompt: beautyProfile.imagery_prompts.vector_zero_beauty_field },
      { slug: IMAGE_SLUGS[1], prompt: beautyProfile.imagery_prompts.light_signature_aesthetic_field },
      { slug: IMAGE_SLUGS[2], prompt: beautyProfile.imagery_prompts.final_beauty_field },
    ];

    /** Origin coordinates display for paid WHOIS when birthContext has lat/lon (no new data). */
    let originCoordinatesDisplay: string | undefined;
    if (typeof derived?.lat === "number" && typeof derived?.lon === "number") {
      const placeName = typeof derived?.placeName === "string" ? derived.placeName.trim() : birthLocation?.trim() || "Unknown location";
      const latStr = derived.lat >= 0 ? `${Number(derived.lat).toFixed(4)}°N` : `${Number(-derived.lat).toFixed(4)}°S`;
      const lonStr = derived.lon >= 0 ? `${Number(derived.lon).toFixed(4)}°E` : `${Number(-derived.lon).toFixed(4)}°W`;
      originCoordinatesDisplay = `${placeName}, ${latStr}, ${lonStr}`;
    }

    let existingRegistry = null;
    try {
      const existing = await loadBeautyProfileV1(reportId, requestId);
      existingRegistry = existing.registry ?? null;
    } catch {
      /* No existing profile; use fresh registry. */
    }

    const payload: BeautyProfileV1 = {
      version: "1.0",
      schemaVersion: SCHEMA_VERSION,
      engineVersion: getEngineVersion(),
      reportId,
      subjectName: fullName,
      dominantArchetype: canonicalArchetype,
      emotionalSnippet: emotionalSnippet || undefined,
      ...beautyProfile,
      timings,
      imageUrls: [],
      /** Full prompts + params used for image generation (no truncation). */
      imagePromptsUsed,
      fullReport: buildCondensedFullReport(beautyProfile, {
        archetypeName: canonicalArchetype,
        useElegantLabels: true,
      }),
      solarProfile,
      solarSeasonProfile,
      birthDate,
      birthTime: birthTime ?? undefined,
      birthLocation,
      ...(originCoordinatesDisplay != null && { originCoordinatesDisplay }),
      registry: buildRegistryForResolved(reportId, existingRegistry, "engine"),
    };
    await saveBeautyProfileV1(reportId, payload, requestId);

    // Generate 3 images to ligs-images/{reportId}/{slug} when allowed (prod, not dryRun).
    if (allowExternalWrites && !bodyDryRun) {
      const prompts = beautyProfile.imagery_prompts;
      const imagePrompts = [
        prompts.vector_zero_beauty_field,
        prompts.light_signature_aesthetic_field,
        prompts.final_beauty_field,
      ];

      const secondaryFromReport = (canonicalArchetype && LIGS_ARCHETYPES.includes(canonicalArchetype as LigsArchetype)
        ? canonicalArchetype
        : FALLBACK_PRIMARY_ARCHETYPE) as LigsArchetype;
      const primaryArchetype = getPrimaryArchetypeFromSolarLongitude(sunLonDeg);
      const secondaryArchetype = resolveSecondaryArchetype(secondaryFromReport, primaryArchetype);

      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
        log("info", "triangulation_debug", {
          requestId,
          primaryArchetype,
          secondaryArchetype,
          twilightPhase,
          sunLonDeg,
        });
      }

      log("info", "stage", { requestId, stage: "image_generation_start", reportId, promptCount: imagePrompts.length });
      const signatureUrls: string[] = [];
      const signaturePrompts: Array<{ slug: string; positive: string; negative: string; full: string }> = [];
      for (let i = 0; i < IMAGE_SLUGS.length; i++) {
        const slug = IMAGE_SLUGS[i];
        const basePrompt = imagePrompts[i] ?? imagePrompts[i - 1] ?? imagePrompts[0] ?? FALLBACK_PROMPT;
        const { positive, negative } = buildTriangulatedImagePrompt({
          primaryArchetype,
          secondaryArchetype,
          solarProfile,
          twilightPhase,
          mode: "signature",
          seed: reportId + slug,
          basePrompt,
        });
        const full = (`${positive} Avoid: ${negative}`).slice(0, 4000);
        signaturePrompts.push({ slug: IMAGE_SLUGS[i], positive, negative, full });
        const prompt = full;
        try {
          const genRes = await fetch(`${origin}/api/generate-image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              reportId,
              slug,
              ...(executionKey && { executionKey }),
            }),
          });
          const genData = (await genRes.json().catch(() => ({}))) as { data?: { url?: string }; url?: string; error?: string };
          const url = genData.data?.url ?? genData.url;
          if (genRes.ok && url) {
            signatureUrls.push(url);
            log("info", "image_generated", { requestId, reportId, slug });
          } else {
            signatureUrls.push("");
            log("warn", "image_generation_failed", { requestId, reportId, slug, error: genData.error });
          }
        } catch (e) {
          signatureUrls.push("");
          log("warn", "image_generation_error", {
            requestId,
            reportId,
            slug,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
      (payload as unknown as Record<string, unknown>).imageUrls = signatureUrls;
      await saveBeautyProfileV1(reportId, payload, requestId);
      log("info", "stage", { requestId, stage: "image_generation_end", reportId });

      // LIVE: Step 1 – marketing_background + logo_mark (triangulated, cached)
      // Step 2 – compose marketing card (bg + logo + overlay)
      // Step 3 – share_card (triangulated)
      const payloadRecord = payload as unknown as Record<string, unknown>;
      if (isValidIdempotencyKey(idempotencyKey)) {
        const profile = buildMinimalVoiceProfile(canonicalArchetype, {
          deterministicId: `minimal_${canonicalArchetype}_${reportId}`,
        });
        const vk = `cd0.15_${reportId}`;
        const imageGenBody = (purpose: string, keySuffix: string, aspectRatio: "1:1" | "16:9" = "16:9") =>
          JSON.stringify({
            profile,
            purpose,
            image: { aspectRatio, size: "1024" as const, count: 1 },
            variationKey: vk,
            archetype: canonicalArchetype,
            idempotencyKey: deriveIdempotencyKey(idempotencyKey, keySuffix),
          });
        const imageGenHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(executionKey ? { "X-LIGS-Execution-Key": executionKey } : {}),
        };

        let marketingBackgroundUrl = payloadRecord.marketingBackgroundUrl as string | undefined;
        let logoMarkUrl = payloadRecord.logoMarkUrl as string | undefined;
        let marketingCardUrl = payloadRecord.marketingCardUrl as string | undefined;
        let shareCardUrl = payloadRecord.shareCardUrl as string | undefined;

        // Idempotency: skip if already in Blob
        if (!marketingBackgroundUrl) marketingBackgroundUrl = (await getImageUrlFromBlob(reportId, "marketing_background")) ?? undefined;
        if (!logoMarkUrl) logoMarkUrl = (await getImageUrlFromBlob(reportId, "logo_mark")) ?? undefined;
        if (!shareCardUrl) shareCardUrl = (await getImageUrlFromBlob(reportId, "share_card")) ?? undefined;

        let marketingBgSpec: { positive: string; negative: string; full: string } | null = null;
        let logoMarkSpec: { positive: string; negative: string; full: string } | null = null;
        let shareCardSpec: { positive: string; negative: string; full: string } | null = null;
        let overlaySpecForKeeper: { headline: string; subhead?: string; cta?: string } | null = null;

        // Step 1a: Generate marketing_background
        if (!marketingBackgroundUrl) {
          try {
            const res = await fetch(`${origin}/api/image/generate`, {
              method: "POST",
              headers: imageGenHeaders,
              body: imageGenBody("marketing_background", "marketing-bg"),
            });
            const data = (await res.json()) as { images?: Array<{ url?: string }>; providerPrompt?: { positive: string; negative: string; full: string } };
            if (data?.providerPrompt) marketingBgSpec = data.providerPrompt;
            const src = pickBackgroundSource(data?.images ? { images: data.images } : null);
            if (src?.url) {
              const imgRes = await fetch(src.url);
              if (imgRes.ok) {
                const buf = await imgRes.arrayBuffer();
                marketingBackgroundUrl = (await saveImageToBlob(reportId, "marketing_background", buf, imgRes.headers.get("content-type") || "image/png")) ?? undefined;
                if (marketingBackgroundUrl) payloadRecord.marketingBackgroundUrl = marketingBackgroundUrl;
              }
            }
          } catch (e) {
            log("warn", "marketing_background_failed", { requestId, reportId, message: e instanceof Error ? e.message : String(e) });
          }
        }

        // Step 1b: Generate logo_mark
        if (!logoMarkUrl) {
          try {
            const res = await fetch(`${origin}/api/image/generate`, {
              method: "POST",
              headers: imageGenHeaders,
              body: imageGenBody("marketing_logo_mark", "logo-mark", "1:1"),
            });
            const data = (await res.json()) as { images?: Array<{ url?: string }>; providerPrompt?: { positive: string; negative: string; full: string } };
            if (data?.providerPrompt) logoMarkSpec = data.providerPrompt;
            const src = pickBackgroundSource(data?.images ? { images: data.images } : null);
            if (src?.url) {
              const imgRes = await fetch(src.url);
              if (imgRes.ok) {
                const buf = await imgRes.arrayBuffer();
                logoMarkUrl = (await saveImageToBlob(reportId, "logo_mark", buf, imgRes.headers.get("content-type") || "image/png")) ?? undefined;
                if (logoMarkUrl) payloadRecord.logoMarkUrl = logoMarkUrl;
              }
            }
          } catch (e) {
            log("warn", "logo_mark_failed", { requestId, reportId, message: e instanceof Error ? e.message : String(e) });
          }
        }

        await saveBeautyProfileV1(reportId, payload, requestId);

        // Step 2: Compose marketing card (bg + logo + overlay)
        if (marketingBackgroundUrl && logoMarkUrl) {
          try {
            const [bgRes, logoRes] = await Promise.all([
              fetch(marketingBackgroundUrl),
              fetch(logoMarkUrl),
            ]);
            if (bgRes.ok && logoRes.ok) {
              const bgBuf = Buffer.from(await bgRes.arrayBuffer());
              const logoBuf = Buffer.from(await logoRes.arrayBuffer());
              const overlaySpec =               buildOverlaySpecWithCopy(
                profile,
                { purpose: "beauty_marketing_card", templateId: "square_card_v1", size: "1024", variationKey: reportId },
                undefined,
                canonicalArchetype
              );
              overlaySpecForKeeper = { headline: overlaySpec.copy.headline, subhead: overlaySpec.copy.subhead, cta: overlaySpec.copy.cta };
              const { buffer: pngBuffer } = await renderStaticCardOverlay(overlaySpec, bgBuf, { size: 1024, logoBuffer: logoBuf });
              marketingCardUrl = (await saveImageToBlob(reportId, "marketing_card", new Uint8Array(pngBuffer).buffer, "image/png")) ?? undefined;
              if (marketingCardUrl) payloadRecord.marketingCardUrl = marketingCardUrl;
            }
          } catch (e) {
            log("warn", "marketing_card_compose_failed", { requestId, reportId, message: e instanceof Error ? e.message : String(e) });
          }
        } else if (marketingBackgroundUrl) {
          // Fallback: compose with background only (monogram logo)
          try {
            const bgRes = await fetch(marketingBackgroundUrl);
            if (bgRes.ok) {
              const bgBuf = Buffer.from(await bgRes.arrayBuffer());
              const overlaySpec = buildOverlaySpecWithCopy(
                profile,
                { purpose: "beauty_marketing_card", templateId: "square_card_v1", size: "1024", variationKey: reportId },
                undefined,
                canonicalArchetype
              );
              overlaySpecForKeeper = { headline: overlaySpec.copy.headline, subhead: overlaySpec.copy.subhead, cta: overlaySpec.copy.cta };
              const { buffer: pngBuffer } = await renderStaticCardOverlay(overlaySpec, bgBuf, { size: 1024 });
              marketingCardUrl = (await saveImageToBlob(reportId, "marketing_card", new Uint8Array(pngBuffer).buffer, "image/png")) ?? undefined;
              if (marketingCardUrl) payloadRecord.marketingCardUrl = marketingCardUrl;
            }
          } catch (e) {
            log("warn", "marketing_card_compose_failed", { requestId, reportId, message: e instanceof Error ? e.message : String(e) });
          }
        }

        // Step 3: Compose Beauty share_card (scientific identity) from Light Signature
        // Uses Light Signature (imageUrls[1]) as background + identity overlay. No DALL·E share_card call.
        if (!shareCardUrl) {
          try {
            const sigUrls = (payloadRecord.imageUrls as string[] | undefined) ?? [];
            const lightSignatureUrl = sigUrls[1] ?? sigUrls[2] ?? sigUrls[0];
            shareCardSpec = signaturePrompts[1] ?? signaturePrompts[2] ?? signaturePrompts[0] ?? null;
            if (lightSignatureUrl) {
              const imgRes = await fetch(lightSignatureUrl);
              if (imgRes.ok) {
                const bgBuf = Buffer.from(await imgRes.arrayBuffer());
                const identitySpec = buildIdentityOverlaySpec({
                  subjectName: fullName || "Subject",
                  archetypeName: canonicalArchetype || "Unknown",
                  reportId,
                  generatedAt: new Date().toISOString(),
                  markArchetype: canonicalArchetype || undefined,
                });
                const composedBuf = await renderIdentityCardOverlay(identitySpec, bgBuf);
                shareCardUrl =
                  (await saveImageToBlob(reportId, "share_card", new Uint8Array(composedBuf).buffer, "image/png")) ?? undefined;
                if (shareCardUrl) payloadRecord.shareCardUrl = shareCardUrl;
                log("info", "share_card_composed", { requestId, reportId });
              }
            }
            if (!shareCardUrl) {
              log("warn", "share_card_skipped_no_signature", { requestId, reportId });
            }
          } catch (e) {
            log("warn", "share_card_failed", { requestId, reportId, message: e instanceof Error ? e.message : String(e) });
          }
        }

        await saveBeautyProfileV1(reportId, payload, requestId);

        // Keeper bundle: write manifest on full-cylinders success (LIVE)
        const sigUrls = (payloadRecord.imageUrls as string[] | undefined) ?? [];
        const hasAllUrls =
          sigUrls.length >= 3 &&
          marketingBackgroundUrl &&
          logoMarkUrl &&
          marketingCardUrl &&
          shareCardUrl;
        // Only write keeper when we have EXACT provider prompts (no rebuild via buildImagePromptSpec)
        if (hasAllUrls && marketingBgSpec && logoMarkSpec && shareCardSpec) {
          const descriptor = getMarketingDescriptor(canonicalArchetype);
          if (!overlaySpecForKeeper) {
            const os = buildOverlaySpecWithCopy(
              profile,
              { purpose: "beauty_marketing_card", templateId: "square_card_v1", size: "1024", variationKey: reportId },
              undefined,
              canonicalArchetype
            );
            overlaySpecForKeeper = { headline: os.copy.headline, subhead: os.copy.subhead, cta: os.copy.cta };
          }

          const keeperManifest: KeeperManifest = {
            reportId,
            primaryArchetype,
            secondaryArchetype,
            twilightPhase,
            sunLonDeg,
            marketingDescriptor: {
              tagline: descriptor.tagline,
              hitPoints: descriptor.hitPoints ?? [],
              ctaText: descriptor.ctaText,
              ctaStyle: descriptor.ctaStyle,
            },
            prompts: {
              signatures: signaturePrompts,
              marketing_background: marketingBgSpec,
              logo_mark: logoMarkSpec,
              marketing_card: overlaySpecForKeeper ?? { headline: "", subhead: "", cta: "" },
              share_card: shareCardSpec,
            },
            urls: {
              signature_0: sigUrls[0] ?? "",
              signature_1: sigUrls[1] ?? "",
              signature_2: sigUrls[2] ?? "",
              marketingBackground: marketingBackgroundUrl ?? "",
              logoMark: logoMarkUrl ?? "",
              marketingCard: marketingCardUrl ?? "",
              shareCard: shareCardUrl ?? "",
            },
            createdAt: Date.now(),
            identitySpecVersion: IDENTITY_SPEC_VERSION,
          };
          const keeperManifestUrl = await saveKeeperManifest(keeperManifest);
          if (keeperManifestUrl) {
            payloadRecord.keeperReady = true;
            payloadRecord.keeperManifestUrl = keeperManifestUrl;
            await saveBeautyProfileV1(reportId, payload, requestId);
            log("info", "keeper_manifest_saved", { requestId, reportId, keeperManifestUrl });
          }
        }
      }
    }

    // Marketing card: when dry (no paid API calls), create deterministic composed card and save to Blob
    const marketingDry =
      isTestMode ||
      bodyDryRun === true ||
      !allowExternalWrites ||
      process.env.DRY_RUN === "1" ||
      process.env.DRY_RUN === "true";
    if (marketingDry) {
      try {
        const profile = buildMinimalVoiceProfile(canonicalArchetype);
        const overlaySpec = buildOverlaySpecWithCopy(profile, {
          purpose: "beauty_marketing_card",
          templateId: "square_card_v1",
          size: "1024",
          variationKey: reportId,
        }, undefined, canonicalArchetype);
        const backgroundBuffer = createArchetypeGradientSvgBuffer(canonicalArchetype);
        const { buffer: pngBuffer } = await renderStaticCardOverlay(overlaySpec, backgroundBuffer, { size: 1024 });
        log("info", "marketing_card_composed", {
          requestId,
          reportId,
          archetypeName: canonicalArchetype,
        });
        const imageBuffer = new Uint8Array(pngBuffer).buffer;
        const url = await saveImageToBlob(
          reportId,
          "marketing_card",
          imageBuffer,
          "image/png"
        );
        if (url) {
          (payload as unknown as Record<string, unknown>).marketingCardUrl = url;
          await saveBeautyProfileV1(reportId, payload, requestId);
          log("info", "marketing_card_saved", { requestId, reportId, url });

          // DRY keeper: write to ligs-keepers-dry/ for landing validation without spend
          const secondaryFromReport = (canonicalArchetype && LIGS_ARCHETYPES.includes(canonicalArchetype as LigsArchetype)
            ? canonicalArchetype
            : FALLBACK_PRIMARY_ARCHETYPE) as LigsArchetype;
          const primaryArchetype = getPrimaryArchetypeFromSolarLongitude(sunLonDeg);
          const secondaryArchetype = resolveSecondaryArchetype(secondaryFromReport, primaryArchetype);
          const descriptor = getMarketingDescriptor(canonicalArchetype);
          const emptyPrompt = { positive: "", negative: "", full: "" };
          const dryKeeper: KeeperManifest = {
            reportId,
            primaryArchetype,
            secondaryArchetype,
            twilightPhase,
            sunLonDeg,
            marketingDescriptor: {
              tagline: descriptor.tagline,
              hitPoints: descriptor.hitPoints ?? [],
              ctaText: descriptor.ctaText,
              ctaStyle: descriptor.ctaStyle,
            },
            prompts: {
              signatures: IMAGE_SLUGS.map((slug) => ({ slug, ...emptyPrompt })),
              marketing_background: emptyPrompt,
              logo_mark: emptyPrompt,
              marketing_card: { headline: overlaySpec.copy.headline, subhead: overlaySpec.copy.subhead, cta: overlaySpec.copy.cta },
              share_card: emptyPrompt,
            },
            urls: {
              signature_0: "",
              signature_1: "",
              signature_2: "",
              marketingBackground: "",
              logoMark: "",
              marketingCard: url,
              shareCard: "",
            },
            createdAt: Date.now(),
            identitySpecVersion: IDENTITY_SPEC_VERSION,
          };
          const dryKeeperUrl = await saveKeeperManifest(dryKeeper, true);
          if (dryKeeperUrl) {
            log("info", "keeper_manifest_dry_saved", { requestId, reportId, dryKeeperUrl });
          }
        }
      } catch (e) {
        log("warn", "marketing_card_compose_failed", {
          requestId,
          reportId,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const imageCallsAttempted =
      allowExternalWrites && !bodyDryRun ? 6 : 0; /* 3 signatures + marketing_background + logo_mark + share_card */
    const llmCallsAttempted = engineDryRun ? 0 : 5;
    const cylindersMeta = {
      llmCallsAttempted,
      imageCallsAttempted,
      allowExternalWrites,
      idempotencyHit: false,
      routesHit: ["engine-generate", "engine"] as const,
    };

    // D) Assets manifest (DRY run path – no LIVE marketing assets)
    const finalPayload = payload as unknown as Record<string, unknown>;
    const sigUrlsFinal = (finalPayload.imageUrls as string[] | undefined) ?? [];
    const sigUrlsResolved = sigUrlsFinal.slice(0, 3);
    if (reportId && (sigUrlsResolved.length < 3 || sigUrlsResolved.some((u) => !u))) {
      for (let i = 0; i < 3; i++) {
        if (!sigUrlsResolved[i]) sigUrlsResolved[i] = (await getImageUrlFromBlob(reportId, IMAGE_SLUGS[i])) ?? "";
      }
    }
    log("info", "assets_manifest", {
      requestId,
      reportId: reportId ?? null,
      signatureImageUrls: sigUrlsResolved,
      marketingBackgroundUrl: (finalPayload.marketingBackgroundUrl as string) ?? null,
      logoMarkUrl: (finalPayload.logoMarkUrl as string) ?? null,
      marketingCardUrl: (finalPayload.marketingCardUrl as string) ?? null,
      shareCardUrl: (finalPayload.shareCardUrl as string) ?? null,
      idempotencyHit: false,
    });

    if (isValidIdempotencyKey(idempotencyKey)) {
      await setIdempotentResult(
        "engine",
        idempotencyKey,
        {
          ...payload,
          dryRun: bodyDryRun === true,
          allowExternalWrites,
          timestamp: Date.now(),
          meta: cylindersMeta,
        },
        { requestId }
      );
    }

    if (
      isEngineExecutionGateEnforced() &&
      bodyDryRun !== true &&
      executionKey
    ) {
      await consumeEngineExecutionGrant(executionKey);
    }

    return successResponse(200, { ...payload, meta: cylindersMeta }, requestId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    log("error", "E.V.E. filter failed", { requestId, message });
    return errorResponse(500, `E.V.E. filter failed: ${message}`, requestId);
  }
}
