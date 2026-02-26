// force vercel rebuild
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { ENGINE_SPEC, IMAGE_PROMPT_SPEC } from "@/lib/engine-spec";
import { VECTOR_ZERO_SPEC } from "@/lib/vector-zero";
import type { VectorZero } from "@/lib/vector-zero";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { saveReportAndConfirm } from "@/lib/report-store";
import { validateEngineBody } from "@/lib/validate-engine-body";
import { getArchetypeOrFallback, FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";
import { scanForbidden, redactForbidden } from "@/lib/engine/constraintGate";
import {
  getIdempotentResult,
  setIdempotentResult,
  isValidIdempotencyKey,
} from "@/lib/idempotency-store";

if (process.env.DRY_RUN === "1") {
  console.log("DRY_RUN ENABLED — skipping OpenAI calls, returning fixture mock");
}

const REPORT_BASE_PROMPT = `Generate the full Light Identity Report and emotional snippet for this birth data using LIGS Engine v1.1 (canonical 14-section structure + Cosmology Marbling Patch):

{{BIRTH_DATA}}

Output valid JSON only with exactly these keys: "full_report" (string, the complete 14-section report: Initiation, Spectral Origin, Temporal Encoding, Gravitational Patterning, Directional Field, Archetype Revelation, Archetype Micro-Profiles, Behavioral Expression, Relational Field, Environmental Resonance, Cosmology Overlay, Identity Field Equation, Legacy Trajectory, Integration. In EVERY section: RAW SIGNAL with 1 subtle cosmological echo; CUSTODIAN with 1 ancient physiological mirror; ORACLE with full fusion of physics, metaphysics, and human meaning—cosmology woven into sentences, not listed. Tone: mythic-scientific, elegant, readable. The full_report must be a long string (multiple paragraphs; no shortening).) and "emotional_snippet" (string, 1-2 declarative sentences). No other text.`;

/** Builds factual Birth Context bullets from derived birth context (no mythology). */
function buildBirthContextBlock(birthContext: unknown): string {
  if (birthContext == null || typeof birthContext !== "object") return "";
  const c = birthContext as Record<string, unknown>;
  const lines: string[] = [];
  const placeName = c.placeName ?? c.birthLocation;
  const lat = c.lat;
  const lon = c.lon;
  if (placeName && typeof lat === "number" && typeof lon === "number") {
    const latStr = lat >= 0 ? `${lat.toFixed(4)}°N` : `${(-lat).toFixed(4)}°S`;
    const lonStr = lon >= 0 ? `${lon.toFixed(4)}°E` : `${(-lon).toFixed(4)}°W`;
    lines.push(`- Location: ${placeName}, ${latStr}, ${lonStr}`);
  }
  if (typeof c.timezoneId === "string" && typeof c.localTimestamp === "string" && typeof c.utcTimestamp === "string") {
    lines.push(`- Timezone: ${c.timezoneId}, Local: ${c.localTimestamp}, UTC: ${c.utcTimestamp}`);
  }
  const sun = c.sun as Record<string, unknown> | undefined;
  if (sun && typeof sun === "object") {
    const alt = sun.sunAltitudeDeg;
    const az = sun.sunAzimuthDeg;
    const above = sun.sunAboveHorizon;
    const phase = sun.twilightPhase;
    const sunrise = sun.sunriseLocal;
    const sunset = sun.sunsetLocal;
    const dayLen = sun.dayLengthMinutes;
    const sunParts: string[] = [];
    if (typeof alt === "number" && typeof az === "number") sunParts.push(`alt ${alt}°, az ${az}°`);
    if (typeof above === "boolean") sunParts.push(above ? "above horizon" : "below horizon");
    if (typeof phase === "string") sunParts.push(`twilight: ${phase}`);
    if (sunParts.length) lines.push(`- Sun: ${sunParts.join("; ")}`);
    if (typeof sunrise === "string") lines.push(`  Sunrise (local): ${sunrise}`);
    if (typeof sunset === "string") lines.push(`  Sunset (local): ${sunset}`);
    if (typeof dayLen === "number") lines.push(`  Day length: ${dayLen} min`);
  }
  const moon = c.moon as Record<string, unknown> | undefined;
  if (moon && typeof moon === "object") {
    const phase = moon.phaseName;
    const illum = moon.illuminationFrac;
    const above = moon.moonAboveHorizon;
    const alt = moon.moonAltitudeDeg;
    const az = moon.moonAzimuthDeg;
    const parts: string[] = [];
    if (typeof phase === "string") parts.push(phase);
    if (typeof illum === "number") parts.push(`${Math.round(illum * 100)}% illuminated`);
    if (typeof above === "boolean") parts.push(above ? "above horizon" : "below horizon");
    if (typeof alt === "number" && typeof az === "number") parts.push(`alt ${alt}°, az ${az}°`);
    if (parts.length) lines.push(`- Moon: ${parts.join("; ")}`);
  }
  if (typeof c.sun_sign === "string" && typeof c.moon_sign === "string" && typeof c.rising_sign === "string") {
    lines.push(`- Computed ecliptic markers (Sun/Moon/Rising ecliptic longitudes): ${c.sun_sign}, ${c.moon_sign}, ${c.rising_sign}`);
  }
  const onThisDay = c.onThisDay as { items?: Array<{ year: number; text: string }> } | undefined;
  if (onThisDay && Array.isArray(onThisDay.items) && onThisDay.items.length > 0) {
    lines.push("");
    lines.push("On this date (world history context):");
    for (const it of onThisDay.items) {
      if (typeof it?.text === "string") {
        const y = typeof it?.year === "number" ? it.year : 0;
        lines.push(y ? `• ${y} — ${it.text}` : `• ${it.text}`);
      }
    }
  }
  if (lines.length === 0) return "";
  return `
------------------------------------------------------------
BIRTH CONTEXT — Factual data only; use to ground the report. No mythology.
------------------------------------------------------------
${lines.join("\n")}
------------------------------------------------------------`;
}

/**
 * Builds the report generation user prompt including the Archetype Voice Block.
 * Use these voice parameters to shape wording in emotional_snippet and in ORACLE phrasing throughout the report.
 */
export function buildReportGenerationPrompt(
  birthData: string,
  archetype?: string,
  birthContext?: unknown
): string {
  const arch = (archetype ?? "").trim() || FALLBACK_PRIMARY_ARCHETYPE;
  const contract = getArchetypeOrFallback(arch);
  const v = contract.voice;

  const voiceBlock = `
------------------------------------------------------------
ARCHETYPE VOICE BLOCK — Use these parameters to shape emotional_snippet and ORACLE phrasing
------------------------------------------------------------
Archetype: ${contract.marketingDescriptor.archetypeLabel}
- emotional_temperature: ${v.emotional_temperature}
- rhythm: ${v.rhythm}
- lexicon_bias: ${v.lexicon_bias.join(", ")}
- metaphor_density: ${v.metaphor_density}
- assertiveness: ${v.assertiveness}
- structure_preference: ${v.structure_preference}
- notes: ${v.notes}

Apply this voice to: (1) the emotional_snippet, and (2) every ORACLE section in the full_report.
------------------------------------------------------------
`;

  let content = REPORT_BASE_PROMPT.replace("{{BIRTH_DATA}}", birthData);
  const ctxBlock = buildBirthContextBlock(birthContext);
  if (ctxBlock) content = content.trim() + ctxBlock;
  return content.trim() + "\n\n" + voiceBlock.trim();
}

export async function POST(request: Request) {
  console.log("AUDIT_HIT_ENGINE_GENERATE");
  console.log("AUDIT_ENV", {
    DEBUG_PROMPT_AUDIT: process.env.DEBUG_PROMPT_AUDIT,
    DEBUG_PERSISTENCE: process.env.DEBUG_PERSISTENCE,
  });
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, method: "POST", path: "/api/engine/generate" });
  let apiKey: string | undefined;
  try {
    const body = await request.json();
    const validation = validateEngineBody(body);
    if (!validation.ok) {
      log("warn", "validation failed", { requestId, error: validation.error.message });
      return errorResponse(400, validation.error.message, requestId);
    }
    const { fullName, birthDate, birthTime, birthLocation, email, dryRun: bodyDryRun, archetype } = validation.value;
    const birthContext = (validation.value as Record<string, unknown>).birthContext;
    const idempotencyKey = (validation.value as Record<string, unknown>).idempotencyKey as string | undefined;

    // Gate X-Force-Live: only honored when ALLOW_FORCE_LIVE=true (default false)
    const allowForceLive = process.env.ALLOW_FORCE_LIVE === "true";
    const forceLive = allowForceLive && request.headers.get("x-force-live") === "1";
    const dryRun = forceLive ? false : (process.env.DRY_RUN === "1" || bodyDryRun === true);

    if (!dryRun && !isValidIdempotencyKey(idempotencyKey)) {
      log("warn", "idempotency_key_required", { requestId });
      return errorResponse(
        400,
        "idempotencyKey (UUID) is required when making live OpenAI calls. Provide it in the request body to prevent duplicate spend.",
        requestId
      );
    }

    // Idempotency: return cached result if same key completed previously
    if (isValidIdempotencyKey(idempotencyKey)) {
      const cached = await getIdempotentResult<{
        reportId: string;
        full_report: string;
        emotional_snippet: string;
        image_prompts: string[];
        vector_zero?: VectorZero;
      }>("engine-generate", idempotencyKey, { requestId });
      if (cached) {
        log("info", "idempotency_hit", { requestId, route: "engine-generate" });
        return successResponse(200, { ...cached, idempotencyHit: true }, requestId);
      }
    }
    if (dryRun) {
      log("info", "DRY_RUN ENABLED — skipping OpenAI calls, returning fixture mock", {
        requestId,
        envDryRun: process.env.DRY_RUN,
        bodyDryRun: bodyDryRun === true,
      });
      const reportId = randomUUID();
      const emotionalSnippet = `[DRY RUN] Light signature for ${fullName} at ${birthLocation}: a structural pattern formed by forces at initialization.`;
      const imagePrompts = [
        `Abstract light field, structural grid, deep navy #050814 with violet #7A4FFF accents, scientific-mythic portal, no figures.`,
        `Cosmic identity architecture, infrared red #FF3B3B and ultraviolet violet #7A4FFF, spectral imprint, 50-80 words.`,
      ];
      const fullReport = `[DRY RUN] Full report placeholder for ${fullName}\n\nInitiation: forces at ${birthDate} ${birthTime || "—"} in ${birthLocation}.\nSpectral Origin, Temporal Encoding, Gravitational Patterning, Directional Field, Archetype Revelation, Behavioral Expression, Relational Field, Environmental Resonance, Cosmology Overlay, Integration.\n\n(Set DRY_RUN=0 or remove the env var to generate real reports.)`;
      const vectorZero: VectorZero = {
        coherence_score: 0.85,
        primary_wavelength: "580–620 nm",
        secondary_wavelength: "450–480 nm",
        symmetry_profile: { lateral: 0.7, vertical: 0.75, depth: 0.7 },
        beauty_baseline: {
          color_family: "warm-neutral",
          texture_bias: "smooth",
          shape_bias: "balanced",
          motion_bias: "steady",
        },
        three_voice: {
          raw_signal: "Baseline field: spectral gradient stable; symmetry axes within nominal range. Unperturbed Light Signature before deviation.",
          custodian: "Vector Zero is the baseline coherence state: the organism's default geometry before environmental or temporal modulation. Biological calibration holds at the unbent configuration.",
          oracle: "The baseline state is the identity at rest—the structure that remains when no force bends it. This is the default; everything else is variation.",
        },
      };
      // Engine must never return success until saveReportAndConfirm verifies the write.
      const writeResult = await saveReportAndConfirm(
        reportId,
        {
          full_report: fullReport,
          emotional_snippet: emotionalSnippet,
          image_prompts: imagePrompts,
          vector_zero: vectorZero,
        },
        log,
        { requestId }
      );
      if (!writeResult.ok) {
        log("error", "Dry-run report storage failed", { requestId, reportId, error: writeResult.error });
        const isProd = process.env.NODE_ENV === "production";
        const debugPersistence = process.env.DEBUG_PERSISTENCE === "1";
        if (isProd && !debugPersistence) {
          return errorResponse(
            503,
            "Report storage failed; report was not saved. Please try again.",
            requestId
          );
        }
        const unsavedId = `UNSAVED:${reportId}`;
        return successResponse(
          200,
          {
            reportId: unsavedId,
            full_report: fullReport,
            emotional_snippet: emotionalSnippet,
            image_prompts: imagePrompts,
            vector_zero: vectorZero,
            warning: "REPORT_NOT_SAVED_BLOB_WRITE_FAILED",
          },
          requestId
        );
      }
      log("info", "saveReportAndConfirm ok", { requestId, reportId });
      const dryPayload = {
        reportId,
        full_report: fullReport,
        emotional_snippet: emotionalSnippet,
        image_prompts: imagePrompts,
        vector_zero: vectorZero,
      };
      if (isValidIdempotencyKey(idempotencyKey)) {
        await setIdempotentResult(
          "engine-generate",
          idempotencyKey,
          { ...dryPayload, dryRun: true, allowExternalWrites: false },
          { requestId }
        );
      }
      return successResponse(200, dryPayload, requestId);
    }

    apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      log("warn", "OPENAI_API_KEY not set", { requestId });
      return errorResponse(
        500,
        "OPENAI_API_KEY not set. Set it in your environment (e.g. Vercel Project Settings → Environment Variables).",
        requestId
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const birthData = `
Full Name: ${fullName}
Birth Date: ${birthDate}
Birth Time: ${birthTime || "Unknown"}
Birth Location: ${birthLocation}
Email: ${email}
`.trim();

    const reportUserPrompt = buildReportGenerationPrompt(birthData, archetype, birthContext);

    // DEV ONLY: prompt audit
    if (process.env.DEBUG_PROMPT_AUDIT === "1") {
      const systemContent = typeof ENGINE_SPEC === "string" ? ENGINE_SPEC : "";
      const userContent = typeof reportUserPrompt === "string" ? reportUserPrompt : "";
      const s = systemContent + "\n---USER---\n" + userContent;
      console.log("PROMPT_AUDIT", {
        hasHardConstraints: s.includes("HARD CONSTRAINTS"),
        hasForbiddenList:
          s.includes("Chakras") &&
          s.includes("Kabbalah") &&
          s.includes("Schumann") &&
          s.includes("Invented equations"),
        hasBirthContext: s.includes("Birth Context"),
        hasOnThisDay: s.includes("On this date (world history context)"),
        head: s.slice(0, 400),
      });
    }

    // Generate report + emotional snippet
    const reportResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ENGINE_SPEC },
        { role: "user", content: reportUserPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const reportText = reportResponse.choices[0]?.message?.content;
    if (!reportText) {
      log("warn", "No report generated", { requestId });
      return errorResponse(500, "No report generated", requestId);
    }

    const reportData = JSON.parse(reportText) as {
      full_report?: string;
      emotional_snippet?: string;
    };

    let fullReport = reportData.full_report ?? "";
    const emotionalSnippet = reportData.emotional_snippet ?? "";

    // Constraint Gate: scan for forbidden terms; run one repair pass if needed
    const initialHits = scanForbidden(fullReport);
    if (initialHits.length > 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("FORBIDDEN_HITS", { hits: initialHits });
      }
      const repairSystem =
        "You are a strict editor. Remove forbidden concepts and pseudo-mystical references. Output valid JSON only with key \"full_report\" (string).";
      const repairUser = `The following report contains forbidden terms: [${initialHits.join(", ")}]. Rewrite the report removing these concepts. Keep the same section headings and overall meaning. Do NOT add new content. Do NOT mention the forbidden list. Maintain factual grounded tone. Keep each RAW SIGNAL / CUSTODIAN / ORACLE under 60 words.\n\nReport:\n${fullReport}`;

      try {
        const repairResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: repairSystem },
            { role: "user", content: repairUser },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        });
        const repairText = repairResponse.choices[0]?.message?.content;
        if (repairText) {
          const repaired = JSON.parse(repairText) as { full_report?: string };
          const repairedReport = repaired.full_report ?? "";
          if (repairedReport.length > 0) {
            fullReport = repairedReport;
            const afterHits = scanForbidden(fullReport);
            if (afterHits.length > 0 && process.env.NODE_ENV !== "production") {
              log("warn", "Constraint Gate: hits remain after repair, redacting", {
                requestId,
                remainingHits: afterHits,
              });
              fullReport = redactForbidden(fullReport, afterHits);
            }
          }
        }
      } catch (e) {
        log("warn", "Constraint Gate repair failed, using original report", {
          requestId,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Generate image prompts based on report
    const imagePromptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: IMAGE_PROMPT_SPEC },
        {
          role: "user",
          content: `Based on this (L)igs report, generate 2 image prompts as a JSON object with key "image_prompts" (array of 2 strings):\n\n${fullReport.slice(0, 4000)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const imagePromptText = imagePromptResponse.choices[0]?.message?.content;
    const imagePromptData = imagePromptText
      ? (JSON.parse(imagePromptText) as { image_prompts?: string[] })
      : { image_prompts: [] };
    const imagePrompts = imagePromptData.image_prompts ?? [];

    // Derive Vector Zero from the report (baseline state; no new pipeline)
    let vectorZero: VectorZero | undefined;
    try {
      const vectorZeroResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: VECTOR_ZERO_SPEC },
          {
            role: "user",
            content: `Derive Vector Zero from this Light Identity Report. Output only the JSON object.\n\n${fullReport.slice(0, 6000)}\n\nEmotional snippet: ${emotionalSnippet}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });
      const vzText = vectorZeroResponse.choices[0]?.message?.content;
      if (vzText) {
        const raw = JSON.parse(vzText) as Record<string, unknown>;
        const clamp = (n: unknown) => Math.min(1, Math.max(0, Number(n) || 0));
        const sym = raw.symmetry_profile as Record<string, unknown> | undefined;
        const beauty = raw.beauty_baseline as Record<string, unknown> | undefined;
        const voices = raw.three_voice as Record<string, unknown> | undefined;
        vectorZero = {
          coherence_score: clamp(raw.coherence_score),
          primary_wavelength: String(raw.primary_wavelength ?? ""),
          secondary_wavelength: String(raw.secondary_wavelength ?? ""),
          symmetry_profile: {
            lateral: clamp(sym?.lateral),
            vertical: clamp(sym?.vertical),
            depth: clamp(sym?.depth),
          },
          beauty_baseline: {
            color_family: String(beauty?.color_family ?? ""),
            texture_bias: String(beauty?.texture_bias ?? ""),
            shape_bias: String(beauty?.shape_bias ?? ""),
            motion_bias: String(beauty?.motion_bias ?? ""),
          },
          three_voice: {
            raw_signal: String(voices?.raw_signal ?? ""),
            custodian: String(voices?.custodian ?? ""),
            oracle: String(voices?.oracle ?? ""),
          },
        };
      }
    } catch (e) {
      log("warn", "Vector Zero derivation failed, report will not include it", { requestId, message: e instanceof Error ? e.message : String(e) });
    }

    const reportId = randomUUID();
    const payload = {
      full_report: fullReport,
      emotional_snippet: emotionalSnippet,
      image_prompts: imagePrompts,
      ...(vectorZero != null && { vector_zero: vectorZero }),
    };
    // Engine must never return success until saveReportAndConfirm verifies the write; on failure return 503 and do not return reportId.
    const writeResult = await saveReportAndConfirm(reportId, payload, log, { requestId });
    if (!writeResult.ok) {
      log("error", "Report storage failed; not returning reportId", {
        requestId,
        reportId,
        error: writeResult.error,
      });
      const isProd = process.env.NODE_ENV === "production";
      const debugPersistence = process.env.DEBUG_PERSISTENCE === "1";
      if (isProd && !debugPersistence) {
        return errorResponse(
          503,
          "Report storage failed; report was not saved. Please try again.",
          requestId
        );
      }
      // Dev fallback: return generated content so we can inspect RAW_ENGINE_GENERATE_RESPONSE when Blob is down.
      const unsavedId = `UNSAVED:${reportId}`;
      return successResponse(
        200,
        {
          reportId: unsavedId,
          full_report: fullReport,
          emotional_snippet: emotionalSnippet,
          image_prompts: imagePrompts,
          ...(vectorZero != null && { vector_zero: vectorZero }),
          warning: "REPORT_NOT_SAVED_BLOB_WRITE_FAILED",
          ...(process.env.NODE_ENV !== "production" &&
            initialHits.length > 0 && { meta: { forbiddenHitsDetected: initialHits } }),
        },
        requestId
      );
    }
    log("info", "saveReportAndConfirm ok", { requestId, reportId });

    const livePayload = {
      reportId,
      full_report: fullReport,
      emotional_snippet: emotionalSnippet,
      image_prompts: imagePrompts,
      ...(vectorZero != null && { vector_zero: vectorZero }),
      ...(process.env.NODE_ENV !== "production" &&
        initialHits.length > 0 && { meta: { forbiddenHitsDetected: initialHits } }),
    };
    if (isValidIdempotencyKey(idempotencyKey)) {
      await setIdempotentResult(
        "engine-generate",
        idempotencyKey,
        {
          ...livePayload,
          dryRun: false,
          allowExternalWrites: process.env.ALLOW_EXTERNAL_WRITES === "true",
          timestamp: Date.now(),
        },
        { requestId }
      );
    }
    return successResponse(200, livePayload, requestId);
  } catch (err) {
    const e = err as { status?: number; code?: string; message?: string };
    log("error", "Engine error", { requestId, message: e?.message ?? String(err) });

    const message = e?.message ?? (err instanceof Error ? err.message : "Unknown error");
    const isQuota = e?.status === 429 || e?.status === 402 || /quota|billing|exceeded|insufficient_quota|rate_limit/i.test(message);

    if (isQuota) {
      log("info", "response", { requestId, status: 503 });
      return NextResponse.json(
        {
          error:
            "OpenAI API quota exceeded. Check your plan and billing at https://platform.openai.com/account/billing. If you just added funds, wait a few minutes and try again. You can set DRY_RUN=1 in your environment to test without using the API.",
          code: "QUOTA_EXCEEDED",
          detail:
            process.env.NODE_ENV === "development"
              ? {
                  openaiStatus: e?.status,
                  openaiCode: e?.code,
                  rawMessage: message,
                  keyLoaded: !!process.env.OPENAI_API_KEY?.trim(),
                  keyPrefix: process.env.OPENAI_API_KEY?.trim()
                    ? `${process.env.OPENAI_API_KEY.trim().slice(0, 12)}…`
                    : "none",
                }
              : undefined,
        },
        { status: 503 }
      );
    }

    return errorResponse(500, `Report generation failed: ${message}`, requestId);
  }
}
