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
import { saveReportAndConfirm, type FieldConditionsContext, type StoredReport } from "@/lib/report-store";
import { validateEngineBody } from "@/lib/validate-engine-body";
import { getArchetypeOrFallback } from "@/src/ligs/archetypes/contract";
import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { getSolarSeasonProfile, getSolarSeasonByIndex } from "@/src/ligs/astronomy/solarSeason";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import { buildReportGenerationPrompt } from "@/lib/engine/buildReportGenerationPrompt";
import { scanForbidden, redactForbidden } from "@/lib/engine/constraintGate";
import { injectDeterministicBlocksIntoReport, getSolarProfileFromContext } from "@/lib/engine/deterministic-blocks";
import { buildDryRunReportFromContext } from "@/lib/engine/buildDryRunReport";
import { approximateSunLongitudeFromDate } from "@/lib/terminal-intake/approximateSunLongitude";
import { computeBirthContextForReport } from "@/lib/engine/computeBirthContextForReport";
import {
  validateThreeVoiceSections,
  buildThreeVoiceRepairPrompt,
} from "@/lib/engine/threeVoiceValidation";
import {
  subjectNamePresentInInitiation,
  injectBirthAnchoringSentence as injectInitiationAnchor,
} from "@/lib/engine/initiation-anchor";
import {
  validateReport,
  buildReportRepairPrompt,
  hasDeterministicAnchors,
  extractCanonicalRegimeFromReport,
} from "@/lib/engine/reportValidators";
import {
  getIdempotentResult,
  setIdempotentResult,
  isValidIdempotencyKey,
} from "@/lib/idempotency-store";
import { killSwitchResponse } from "@/lib/api-kill-switch";
import {
  ENGINE_EXECUTION_DEFER_CONSUME_HEADER,
  extractExecutionKey,
  getEngineExecutionGrantViolation,
  consumeEngineExecutionGrant,
} from "@/lib/engine-execution-grant";
import { resolveFieldConditionsForBirth } from "@/lib/field-conditions";

if (process.env.DRY_RUN === "1") {
  console.log("DRY_RUN ENABLED — skipping OpenAI calls, returning fixture mock");
}

/**
 * Normalize birth date for INITIATION display. Prefer YYYY-MM-DD; parse MM/DD/YYYY or DD/MM/YYYY.
 * Does not corrupt digits. Returns normalized string or original if unparseable.
 */
function normalizeBirthDateForDisplay(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "unknown";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, a, b, y] = slash;
    const m = a!.padStart(2, "0");
    const d = b!.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return s;
}

/**
 * Normalize birth time for INITIATION display. Expect HH:mm or HH:mm:ss; pad to HH:mm.
 */
function normalizeBirthTimeForDisplay(raw: string): string {
  const s = (raw ?? "").trim().replace(/\s/g, "");
  if (!s) return "00:00";
  const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const h = match[1]!.padStart(2, "0");
    const m = match[2]!.padStart(2, "0");
    return `${h}:${m}`;
  }
  if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2)}`;
  return s || "00:00";
}

/**
 * Normalize birth place for INITIATION display: title-case, add comma before 2-letter state suffix.
 */
function normalizeBirthPlaceForDisplay(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "unknown";
  const words = s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  if (words.length >= 2 && words[words.length - 1]!.length === 2) {
    words[words.length - 1] = words[words.length - 1]!.toUpperCase();
    return words.slice(0, -1).join(" ") + ", " + words[words.length - 1];
  }
  return words.join(" ");
}

/**
 * Build a minimal birth context from request values for DRY_RUN when computeBirthContextForReport fails.
 * Ensures BOUNDARY CONDITIONS uses the same request-derived data as INITIATION (no stale fixture).
 */
function buildDryRunSyntheticBirthContext(
  birthDate: string,
  birthTime: string,
  birthLocation: string
): Record<string, unknown> {
  const dateStr = normalizeBirthDateForDisplay(birthDate);
  const timeStr = normalizeBirthTimeForDisplay(birthTime);
  const localTimestamp =
    dateStr !== "unknown" && timeStr !== "00:00"
      ? `${dateStr}T${timeStr}:00.000`
      : dateStr !== "unknown"
        ? `${dateStr}T00:00:00.000`
        : "unknown";
  return {
    placeName: (birthLocation ?? "").trim() || "unknown",
    localTimestamp,
    utcTimestamp: "unknown",
    timezoneId: "unknown",
  };
}

/** LigsStudio default birth data (1990-01-15, 14:30, New York, NY) — used when compute fails in development (non–DRY_RUN). */
const STUDIO_FALLBACK_BIRTH_CONTEXT: Record<string, unknown> = {
  lat: 40.7128,
  lon: -74.006,
  placeName: "New York, NY",
  timezoneId: "America/New_York",
  localTimestamp: "1990-01-15T14:30:00.000-05:00",
  utcTimestamp: "1990-01-15T19:30:00.000Z",
  sun: {
    sunAltitudeDeg: 25,
    sunAzimuthDeg: 210,
    sunAboveHorizon: true,
    twilightPhase: "day",
    sunriseLocal: "1990-01-15T07:15:00.000-05:00",
    sunsetLocal: "1990-01-15T17:00:00.000-05:00",
    dayLengthMinutes: 585,
  },
  moon: {
    phaseName: "Waning Gibbous",
    illuminationFrac: 0.8,
    moonAltitudeDeg: 45,
    moonAzimuthDeg: 120,
    moonAboveHorizon: true,
  },
  sunLonDeg: 295,
  solarSeasonProfile: {
    seasonIndex: 11,
    archetype: "Fluxionis",
    lonCenterDeg: 345,
    solarDeclinationDeg: -20,
    seasonalPolarity: "waning",
    anchorType: "none",
  },
  sun_sign: "Capricorn",
  moon_sign: "Capricorn",
  rising_sign: "Libra",
};

/** Format birth context for Origin Coordinates display: "City, State/Region, Country — LAT°N/S, LON°E/W". Same as free-whois-report; used to persist so paid WHOIS shows real coordinates without re-geocoding. */
function formatOriginCoordinatesFromContext(birthContext: Record<string, unknown>): string | undefined {
  const placeName = birthContext.placeName ?? birthContext.birthLocation;
  const lat = birthContext.lat;
  const lon = birthContext.lon;
  const place = typeof placeName === "string" && placeName.trim() ? placeName.trim() : "Unknown location";
  if (typeof lat === "number" && typeof lon === "number") {
    const latStr = lat >= 0 ? `${Number(lat).toFixed(4)}°N` : `${Number(-lat).toFixed(4)}°S`;
    const lonStr = lon >= 0 ? `${Number(lon).toFixed(4)}°E` : `${Number(-lon).toFixed(4)}°W`;
    return `${place} — ${latStr}, ${lonStr}`;
  }
  return typeof place === "string" && place !== "Unknown location" ? place : undefined;
}

function buildFieldConditionsContext(birthContext: Record<string, unknown> | undefined): FieldConditionsContext | undefined {
  if (!birthContext) return undefined;
  const sun = birthContext.sun as Record<string, unknown> | undefined;
  const moon = birthContext.moon as Record<string, unknown> | undefined;
  const solar = birthContext.solarSeasonProfile as Record<string, unknown> | undefined;
  return {
    sunAltitudeDeg: typeof sun?.sunAltitudeDeg === "number" ? (sun.sunAltitudeDeg as number) : undefined,
    sunAzimuthDeg: typeof sun?.sunAzimuthDeg === "number" ? (sun.sunAzimuthDeg as number) : undefined,
    sunriseLocal: typeof sun?.sunriseLocal === "string" ? sun.sunriseLocal : undefined,
    sunsetLocal: typeof sun?.sunsetLocal === "string" ? sun.sunsetLocal : undefined,
    dayLengthMinutes: typeof sun?.dayLengthMinutes === "number" ? (sun.dayLengthMinutes as number) : undefined,
    moonPhaseName: typeof moon?.phaseName === "string" ? moon.phaseName : undefined,
    moonIlluminationFrac: typeof moon?.illuminationFrac === "number" ? (moon.illuminationFrac as number) : undefined,
    moonAltitudeDeg: typeof moon?.moonAltitudeDeg === "number" ? (moon.moonAltitudeDeg as number) : undefined,
    moonAzimuthDeg: typeof moon?.moonAzimuthDeg === "number" ? (moon.moonAzimuthDeg as number) : undefined,
    sunLonDeg: typeof birthContext.sunLonDeg === "number" ? (birthContext.sunLonDeg as number) : (typeof solar?.lonCenterDeg === "number" ? (solar.lonCenterDeg as number) : undefined),
    solarDeclinationDeg: typeof solar?.solarDeclinationDeg === "number" ? (solar.solarDeclinationDeg as number) : undefined,
    solarPolarity: typeof solar?.seasonalPolarity === "string" ? solar.seasonalPolarity : undefined,
    anchorType: typeof solar?.anchorType === "string" ? solar.anchorType : undefined,
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, method: "POST", path: "/api/engine/generate" });
  let apiKey: string | undefined;
  try {
    const body = await request.json();
    // Dry-run (Studio Test Paid Report) is zero-cost; allow it even when LIGS_API_OFF is set.
    // Header ensures dry-run is recognized even if body is lost in serverless/internal fetch.
    const isDryRunRequest =
      request.headers.get("x-ligs-dry-run") === "true" || body?.dryRun === true;
    if (!isDryRunRequest) {
      const kill = killSwitchResponse();
      if (kill) return kill;
    }
    console.log("AUDIT_HIT_ENGINE_GENERATE");
    console.log("AUDIT_ENV", {
      DEBUG_PROMPT_AUDIT: process.env.DEBUG_PROMPT_AUDIT,
      DEBUG_PERSISTENCE: process.env.DEBUG_PERSISTENCE,
    });
    const validation = validateEngineBody(body);
    if (!validation.ok) {
      log("warn", "validation failed", { requestId, error: validation.error.message });
      return errorResponse(400, validation.error.message, requestId);
    }
    const { fullName, birthDate, birthTime, birthLocation, email, dryRun: bodyDryRun, archetype } = validation.value;
    let birthContext = (validation.value as Record<string, unknown>).birthContext as Record<string, unknown> | undefined;
    const idempotencyKey = (validation.value as Record<string, unknown>).idempotencyKey as string | undefined;

    // Gate X-Force-Live and DRY_RUN — needed before birthContext so we can use request-derived synthetic context when compute fails in DRY_RUN
    const allowForceLive = process.env.ALLOW_FORCE_LIVE === "true";
    const forceLive = allowForceLive && request.headers.get("x-force-live") === "1";
    const dryRun = forceLive ? false : (process.env.DRY_RUN === "1" || bodyDryRun === true);

    // Upstream computation: always compute birthContext when birthDate + birthLocation + birthTime provided (ensures complete values, no placeholders)
    if (birthDate && birthLocation && birthTime) {
      try {
        const computed = await computeBirthContextForReport(birthDate, birthLocation, birthTime);
        birthContext = { ...computed, ...(birthContext && { onThisDay: (birthContext as Record<string, unknown>).onThisDay }) };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        log("error", "Birth context computation failed", {
          requestId,
          birthDate,
          birthTime,
          birthLocation,
          error: msg,
          stack,
          usingSyntheticFallback: dryRun,
        });
        console.error("computeBirthContextForReport failed", {
          birthDate,
          birthTime,
          birthLocation,
          errorMessage: msg,
          errorStack: stack,
          dryRun,
          fallbackToSynthetic: dryRun,
        });
        if (dryRun) {
          // DRY_RUN: use request-derived synthetic context so BOUNDARY CONDITIONS matches INITIATION (no stale fixture)
          birthContext = buildDryRunSyntheticBirthContext(birthDate, birthTime, birthLocation);
          log("info", "DRY_RUN using request-derived synthetic birth context", { requestId });
        } else if (process.env.NODE_ENV !== "production") {
          log("warn", "Using LigsStudio fallback birth context", { requestId });
          birthContext = STUDIO_FALLBACK_BIRTH_CONTEXT;
        } else {
          return errorResponse(500, "Birth context computation failed. Please verify birth date, time, and location.", requestId);
        }
      }
    }

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

    const executionKey = extractExecutionKey(request, body as Record<string, unknown>);
    const deferGrantConsume =
      request.headers.get(ENGINE_EXECUTION_DEFER_CONSUME_HEADER) === "1";
    if (!dryRun) {
      const gv = await getEngineExecutionGrantViolation(executionKey, { dryRun: false });
      if (gv) {
        return errorResponse(403, gv, requestId);
      }
    }

    // Studio "Test Paid Report (safe / no image cost)" path: POST /api/beauty/dry-run → this route with dryRun=true.
    // We skip OpenAI and image generation (no cost) but run full report enrichment: field_conditions_context, originCoordinatesDisplay,
    // and resolveFieldConditionsForBirth (GFZ Kp, Open-Meteo) so Magnetic/Climate/Sensory are real in paid WHOIS.
    if (dryRun) {
      log("info", "DRY_RUN ENABLED — skipping OpenAI, using real report pipeline", {
        requestId,
        envDryRun: process.env.DRY_RUN,
        bodyDryRun: bodyDryRun === true,
      });
      const reportId = randomUUID();
      const initDate = normalizeBirthDateForDisplay(birthDate ?? "");
      const initTime = normalizeBirthTimeForDisplay(birthTime ?? "");
      const initPlace = normalizeBirthPlaceForDisplay(birthLocation ?? "");
      // Enrich birthContext with solar profile from birth date when missing (e.g. synthetic context)
      let dryRunBirthContext = birthContext ?? {};
      if (!getSolarProfileFromContext(dryRunBirthContext) && birthDate?.trim()) {
        const sunLon = approximateSunLongitudeFromDate(birthDate.trim().slice(0, 10));
        if (sunLon != null) {
          const lat = typeof dryRunBirthContext.lat === "number" ? dryRunBirthContext.lat : 0;
          const profile = getSolarSeasonProfile({
            sunLonDeg: sunLon,
            latitudeDeg: lat,
            date: /^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim().slice(0, 10))
              ? new Date(birthDate.trim().slice(0, 10) + "T12:00:00Z")
              : new Date(),
          });
          const entry = getSolarSeasonByIndex(profile.seasonIndex);
          dryRunBirthContext = {
            ...dryRunBirthContext,
            sunLonDeg: sunLon,
            solarSeasonProfile: {
              ...profile,
              anchorType: entry?.anchorType ?? "none",
            },
          };
        }
      }
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
          custodian: "Vector Zero is the baseline coherence state: the organism's default geometry before environmental or temporal modulation. Biological calibration holds at the unbent configuration state.",
          oracle: "The baseline state is the identity at rest—the structure that remains when no force bends it. This is the default; everything else is variation.",
        },
      };
      const fullReport = buildDryRunReportFromContext(
        dryRunBirthContext as Record<string, unknown>,
        vectorZero,
        fullName ?? "the subject",
        initDate,
        initTime,
        initPlace
      );
      const solarProfile = getSolarProfileFromContext(dryRunBirthContext);
      const archForSnippet = solarProfile?.archetype ?? "Stabiliora";
      let emotionalSnippet: string;
      try {
        const cosmic = getCosmicAnalogue(archForSnippet as LigsArchetype);
        emotionalSnippet = cosmic.description.split(/[.!]/)[0]?.trim()
          ? `${cosmic.description.split(/[.!]/)[0]!.trim()}.`
          : `Light signature at initialization: structural pattern for ${fullName ?? "the subject"} at ${birthLocation ?? "birth"}.`;
      } catch {
        emotionalSnippet = `Light signature at initialization: structural pattern for ${fullName ?? "the subject"} at ${birthLocation ?? "birth"}.`;
      }
      const imagePrompts = [
        `Abstract light field, structural grid, deep navy #050814 with violet #7A4FFF accents, scientific-mythic portal, no figures.`,
        `Cosmic identity architecture, infrared red #FF3B3B and ultraviolet violet #7A4FFF, spectral imprint, 50-80 words.`,
      ];
      // Inject (L) deterministic blocks before save (use enriched dry-run context)
      const fullReportWithBlocks = injectDeterministicBlocksIntoReport(fullReport, {
        birthContext: dryRunBirthContext,
        vectorZero,
        resolvedArchetype: archetype,
      });
      // Engine must never return success until saveReportAndConfirm verifies the write.
      const originDisplay =
        dryRunBirthContext != null ? formatOriginCoordinatesFromContext(dryRunBirthContext as Record<string, unknown>) : undefined;
      // Dry-run: no image cost, but run field-condition lookups so Studio Test Paid Report shows real Magnetic/Climate/Sensory (GFZ/Open-Meteo are free).
      let fieldConditionsDisplays: {
        magneticFieldIndexDisplay: string | null;
        climateSignatureDisplay: string | null;
        sensoryFieldConditionsDisplay: string | null;
      } | null = null;
      if (dryRunBirthContext != null) {
        try {
          fieldConditionsDisplays = await resolveFieldConditionsForBirth(dryRunBirthContext as Record<string, unknown>, {
            skipExternalLookups: false,
          });
          console.log("fieldConditionsDisplays:", fieldConditionsDisplays);
        } catch (err) {
          console.error("resolveFieldConditionsForBirth threw", err);
          fieldConditionsDisplays = {
            magneticFieldIndexDisplay: null,
            climateSignatureDisplay: null,
            sensoryFieldConditionsDisplay: null,
          };
        }
      }
      const dryRunPayload: Omit<StoredReport, "createdAt"> = {
        full_report: fullReportWithBlocks,
        emotional_snippet: emotionalSnippet,
        image_prompts: imagePrompts,
        vector_zero: vectorZero,
      };
      if (dryRunBirthContext != null) {
        const ctx = buildFieldConditionsContext(dryRunBirthContext as Record<string, unknown>);
        if (ctx != null) dryRunPayload.field_conditions_context = ctx;
      }
      if (originDisplay != null) dryRunPayload.originCoordinatesDisplay = originDisplay;
      if (fieldConditionsDisplays != null) {
        if (fieldConditionsDisplays.magneticFieldIndexDisplay != null)
          dryRunPayload.magneticFieldIndexDisplay = fieldConditionsDisplays.magneticFieldIndexDisplay;
        if (fieldConditionsDisplays.climateSignatureDisplay != null)
          dryRunPayload.climateSignatureDisplay = fieldConditionsDisplays.climateSignatureDisplay;
        if (fieldConditionsDisplays.sensoryFieldConditionsDisplay != null)
          dryRunPayload.sensoryFieldConditionsDisplay = fieldConditionsDisplays.sensoryFieldConditionsDisplay;
      }
      const birthContextSummary =
        dryRunBirthContext != null
          ? {
              placeName: (dryRunBirthContext as Record<string, unknown>).placeName,
              lat: (dryRunBirthContext as Record<string, unknown>).lat,
              lon: (dryRunBirthContext as Record<string, unknown>).lon,
              timezoneId: (dryRunBirthContext as Record<string, unknown>).timezoneId,
              utcTimestamp:
                typeof (dryRunBirthContext as Record<string, unknown>).utcTimestamp === "string"
                  ? ((dryRunBirthContext as Record<string, unknown>).utcTimestamp as string).slice(0, 19)
                  : (dryRunBirthContext as Record<string, unknown>).utcTimestamp,
              hasSun: !!(dryRunBirthContext as Record<string, unknown>).sun,
              hasMoon: !!(dryRunBirthContext as Record<string, unknown>).moon,
            }
          : null;
      console.log("DRY_RUN_AUDIT_BEFORE_SAVE", {
        reportId,
        birthContextSummary,
        fieldConditionsDisplays,
        savedPayloadFields: {
          originCoordinatesDisplay: dryRunPayload.originCoordinatesDisplay,
          hasFieldConditionsContext: !!dryRunPayload.field_conditions_context,
          field_conditions_context: dryRunPayload.field_conditions_context,
          magneticFieldIndexDisplay: dryRunPayload.magneticFieldIndexDisplay,
          climateSignatureDisplay: dryRunPayload.climateSignatureDisplay,
          sensoryFieldConditionsDisplay: dryRunPayload.sensoryFieldConditionsDisplay,
        },
      });
      const writeResult = await saveReportAndConfirm(reportId, dryRunPayload, log, { requestId });
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
            full_report: fullReportWithBlocks,
            emotional_snippet: emotionalSnippet,
            image_prompts: imagePrompts,
            vector_zero: vectorZero,
            warning: "REPORT_NOT_SAVED_BLOB_WRITE_FAILED",
          },
          requestId
        );
      }
      log("info", "saveReportAndConfirm ok", { requestId, reportId });
      const dryPayload: Record<string, unknown> = {
        reportId,
        full_report: fullReportWithBlocks,
        emotional_snippet: emotionalSnippet,
        image_prompts: imagePrompts,
        vector_zero: vectorZero,
      };
      const solarProfileForPayload = getSolarProfileFromContext(dryRunBirthContext);
      if (solarProfileForPayload != null) {
        dryPayload.dominantArchetype = solarProfileForPayload.archetype;
        const fullSolar = (dryRunBirthContext as Record<string, unknown>).solarSeasonProfile as Record<string, unknown> | undefined;
        if (fullSolar && typeof fullSolar.seasonIndex === "number") {
          dryPayload.solarSeasonProfile = fullSolar;
        }
      }
      if (originDisplay != null) dryPayload.originCoordinatesDisplay = originDisplay;
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
Birth Time: ${birthTime}
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

    // HARD INVARIANT: Subject name must appear in INITIATION. Inject deterministically if missing.
    if (fullName && birthDate && birthLocation && !subjectNamePresentInInitiation(fullReport, { fullName, birthDate, birthLocation })) {
      const injectResult = injectInitiationAnchor(fullReport, { fullName, birthDate, birthLocation });
      if (injectResult.ok) {
        fullReport = injectResult.report;
        log("info", "Subject name anchored in INITIATION (early injection)", {
          requestId,
          repairPath: injectResult.repairPath,
        });
      } else {
        log("error", "Subject name injection failed — INITIATION section not found or no insertion point", {
          requestId,
          initiationFound: injectResult.initiationFound,
          insertionPointFound: injectResult.insertionPointFound,
          reason: injectResult.reason,
        });
        return errorResponse(
          500,
          "Report pipeline error: Could not anchor subject name in INITIATION. The report structure may be invalid.",
          requestId
        );
      }
    }

    // Quality check: INITIATION should reference solar-season / cosmic analogue physics
    const INITIATION_SOLAR_COSMIC_KEYWORDS = [
      "declination", "polarity", "anchor", "equinox", "solstice", "crossquarter",
      "protostar", "pulsar", "lensing", "jets", "accretion", "supernova", "cosmic web",
    ];
    const initMatch = fullReport.match(/(?:^|\n)\s*1\.\s*Initiation[\s\S]*?(?=\n\s*2\.\s+Spectral|$)/i);
    const initiationSection = initMatch ? initMatch[0] : fullReport.slice(0, 1500);
    const hasKeyword = INITIATION_SOLAR_COSMIC_KEYWORDS.some((kw) =>
      initiationSection.toLowerCase().includes(kw)
    );
    if (!hasKeyword) {
      log("warn", "INITIATION missing solar-season / cosmic analogue reference", {
        requestId,
        initiationPreview: initiationSection.slice(0, 200),
      });
    }

    // Three-voice validation: repair sections missing RAW SIGNAL, CUSTODIAN, or ORACLE
    const voiceIssues = validateThreeVoiceSections(fullReport);
    if (voiceIssues.length > 0) {
      log("info", "Three-voice validation: repairing sections", {
        requestId,
        sections: voiceIssues.map((i) => i.sectionNum),
      });
      try {
        const repairResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You add missing voice labels (RAW SIGNAL, CUSTODIAN, ORACLE) to report sections. Output valid JSON only with key \"full_report\" (string). Do not change any other content.",
            },
            { role: "user", content: buildThreeVoiceRepairPrompt(fullReport, voiceIssues) },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        });
        const repairText = repairResponse.choices[0]?.message?.content;
        if (repairText) {
          const repaired = JSON.parse(repairText) as { full_report?: string };
          if (repaired.full_report?.length) fullReport = repaired.full_report;
        }
      } catch (e) {
        log("warn", "Three-voice repair failed", {
          requestId,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

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

    // Inject (L) deterministic blocks after LLM — BOUNDARY CONDITIONS, FIELD SOLUTION, LIGHT IDENTITY SUMMARY
    fullReport = injectDeterministicBlocksIntoReport(fullReport, {
      birthContext: birthContext ?? {},
      vectorZero: vectorZero ?? undefined,
      resolvedArchetype: archetype,
    });

    // Report quality validators: run only when deterministic anchors exist
    const runValidation = hasDeterministicAnchors(fullReport);
    const canonicalRegime =
      extractCanonicalRegimeFromReport(fullReport) ??
      getSolarProfileFromContext(birthContext ?? {})?.archetype ??
      archetype;
    const qualityIssues = runValidation
      ? validateReport(fullReport, {
          subjectInput: { fullName, birthDate, birthLocation },
          canonicalRegime,
        })
      : [];

    if (qualityIssues.length > 0) {
      log("info", "Report quality validation: attempting repair", {
        requestId,
        issueCount: qualityIssues.length,
        codes: qualityIssues.map((i) => i.code),
      });
      try {
        const { system: repairSystem, user: repairUser } = buildReportRepairPrompt(
          fullReport,
          qualityIssues,
          { subjectInput: { fullName, birthDate, birthLocation }, canonicalRegime }
        );
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
          if (repaired.full_report?.length) {
            fullReport = repaired.full_report;
            const afterIssues = validateReport(fullReport, {
              subjectInput: { fullName, birthDate, birthLocation },
              canonicalRegime,
            });
            if (afterIssues.length > 0) {
              const hasNameMissing = afterIssues.some((i) => i.code === "SUBJECT_NAME_MISSING");
              if (hasNameMissing && fullName && birthDate && birthLocation) {
                const injectResult = injectInitiationAnchor(fullReport, {
                  fullName,
                  birthDate,
                  birthLocation,
                });
                if (!injectResult.ok) {
                  log("error", "Subject name injection failed after repair pass", {
                    requestId,
                    initiationFound: injectResult.initiationFound,
                    insertionPointFound: injectResult.insertionPointFound,
                    reason: injectResult.reason,
                  });
                  return errorResponse(
                    500,
                    "Report pipeline error: Could not anchor subject name in INITIATION. The report structure may be invalid.",
                    requestId
                  );
                }
                fullReport = injectResult.report;
                const retryIssues = validateReport(fullReport, {
                  subjectInput: { fullName, birthDate, birthLocation },
                  canonicalRegime,
                });
                if (retryIssues.some((i) => i.code === "SUBJECT_NAME_MISSING")) {
                  log("error", "Subject name still missing after deterministic injection", {
                    requestId,
                    code: "SUBJECT_NAME_MISSING",
                    repairPath: injectResult.repairPath,
                  });
                  return errorResponse(
                    500,
                    "Report failed validation: Report must reference the individual's full name in INITIATION.",
                    requestId
                  );
                }
                afterIssues.length = 0;
                afterIssues.push(...retryIssues);
              }
              if (afterIssues.length > 0) {
                const top = afterIssues[0]!;
                log("warn", "Report failed validation after repair", {
                  requestId,
                  code: top.code,
                  message: top.message,
                  detail: top.detail,
                });
                return errorResponse(
                  500,
                  `Report failed validation: ${top.message}`,
                  requestId
                );
              }
            }
          }
        }
      } catch (e) {
        const top = qualityIssues[0]!;
        log("warn", "Report quality repair failed", {
          requestId,
          error: e instanceof Error ? e.message : String(e),
          code: top.code,
          detail: top.detail,
        });
        return errorResponse(
          500,
          `Report failed validation: ${top.message}`,
          requestId
        );
      }
    }

    const reportId = randomUUID();
    const originDisplay =
      birthContext != null ? formatOriginCoordinatesFromContext(birthContext) : undefined;
    let fieldConditionsDisplays: {
      magneticFieldIndexDisplay: string | null;
      climateSignatureDisplay: string | null;
      sensoryFieldConditionsDisplay: string | null;
    } | null = null;
    if (birthContext != null) {
      try {
        fieldConditionsDisplays = await resolveFieldConditionsForBirth(birthContext, {
          skipExternalLookups: false,
        });
        console.log("fieldConditionsDisplays:", fieldConditionsDisplays);
      } catch (err) {
        console.error("resolveFieldConditionsForBirth threw", err);
        fieldConditionsDisplays = {
          magneticFieldIndexDisplay: null,
          climateSignatureDisplay: null,
          sensoryFieldConditionsDisplay: null,
        };
      }
    }
    const payload: Omit<StoredReport, "createdAt"> = {
      full_report: fullReport,
      emotional_snippet: emotionalSnippet,
      image_prompts: imagePrompts,
    };
    if (vectorZero != null) payload.vector_zero = vectorZero;
    if (birthContext != null) {
      const ctx = buildFieldConditionsContext(birthContext);
      if (ctx != null) payload.field_conditions_context = ctx;
    }
    if (originDisplay != null) payload.originCoordinatesDisplay = originDisplay;
    if (fieldConditionsDisplays != null) {
      if (fieldConditionsDisplays.magneticFieldIndexDisplay != null)
        payload.magneticFieldIndexDisplay = fieldConditionsDisplays.magneticFieldIndexDisplay;
      if (fieldConditionsDisplays.climateSignatureDisplay != null)
        payload.climateSignatureDisplay = fieldConditionsDisplays.climateSignatureDisplay;
      if (fieldConditionsDisplays.sensoryFieldConditionsDisplay != null)
        payload.sensoryFieldConditionsDisplay = fieldConditionsDisplays.sensoryFieldConditionsDisplay;
    }
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
      if (!deferGrantConsume) {
        await consumeEngineExecutionGrant(executionKey);
      }
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
    if (!deferGrantConsume) {
      await consumeEngineExecutionGrant(executionKey);
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
