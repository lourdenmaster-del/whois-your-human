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
import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { getSolarSeasonProfile, getSolarSeasonByIndex } from "@/src/ligs/astronomy/solarSeason";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import { scanForbidden, redactForbidden } from "@/lib/engine/constraintGate";
import { injectDeterministicBlocksIntoReport, getSolarProfileFromContext } from "@/lib/engine/deterministic-blocks";
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

if (process.env.DRY_RUN === "1") {
  console.log("DRY_RUN ENABLED — skipping OpenAI calls, returning fixture mock");
}

/** LigsStudio default birth data (1990-01-15, 14:30, New York, NY) — used when compute fails in development. */
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

const REPORT_BASE_PROMPT = `Generate the full field-resolution report and emotional snippet for this birth data (Engine v1.3.2 — 14-section structure, field-resolution document, observational only):

{{BIRTH_DATA}}

Output valid JSON only with exactly these keys: "full_report" (string, the complete 14-section field-resolution report: Initiation MUST begin with "(L) denotes the identity field..." law statement — then 14 sections. In EVERY section: RAW SIGNAL (max 3 bullets, each ending with [key=value] citation from BOUNDARY/RESOLUTION KEYS/FIELD SOLUTION), CUSTODIAN (max 2 bullets), ORACLE (1-2 lines). Max 18 words per sentence; each section under 90 words total. Use observational language only; no chakras, Kabbalah, mystical claims, or "Light Identity Grid System". Tone: mythic-scientific, elegant, readable. The full_report must be a complete string.) and "emotional_snippet" (string, 1-2 declarative sentences). No other text.`;

/** Builds minimal ground-truth context for LLM (values only). Deterministic blocks are injected after generation. */
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
GROUND TRUTH (for reference; BOUNDARY CONDITIONS will be inserted separately)
------------------------------------------------------------
${lines.join("\n")}
------------------------------------------------------------`;
}

/** Builds Solar Season + Cosmic Analogue block from birthContext or computed profile. Never invents solar values — uses "unknown" when sunLonDeg/solarSeasonProfile missing. */
function buildSolarSeasonCosmicBlock(birthContext: unknown): string {
  const c = birthContext as Record<string, unknown> | undefined;
  const precomputed = c?.solarSeasonProfile as Record<string, unknown> | undefined;
  const hasPrecomputed =
    precomputed &&
    typeof precomputed.seasonIndex === "number" &&
    typeof precomputed.archetype === "string" &&
    typeof precomputed.lonCenterDeg === "number" &&
    typeof precomputed.solarDeclinationDeg === "number" &&
    typeof precomputed.seasonalPolarity === "string";
  const sunLonDeg = c?.sunLonDeg;
  const hasSunLonDeg = typeof sunLonDeg === "number";

  let solarSection: string;
  let archetypeForAnalogue: LigsArchetype;

  if (hasPrecomputed) {
    const entry = getSolarSeasonByIndex(precomputed!.seasonIndex as number);
    solarSection = `Solar season:
- seasonIndex: ${precomputed!.seasonIndex}
- archetype: ${precomputed!.archetype}
- lonCenterDeg: ${precomputed!.lonCenterDeg}
- declinationDeg: ${Math.round((precomputed!.solarDeclinationDeg as number) * 100) / 100}
- polarity: ${precomputed!.seasonalPolarity}
- anchorType: ${(precomputed!.anchorType as string) ?? entry?.anchorType ?? "none"}`;
    archetypeForAnalogue = precomputed!.archetype as LigsArchetype;
  } else if (hasSunLonDeg) {
    const lat = typeof c?.lat === "number" ? c.lat : 0;
    const utcTimestamp = typeof c?.utcTimestamp === "string" ? c.utcTimestamp : "";
    const sun = c?.sun as Record<string, unknown> | undefined;
    const computed = getSolarSeasonProfile({
      sunLonDeg: sunLonDeg as number,
      latitudeDeg: lat,
      date: utcTimestamp ? new Date(utcTimestamp) : new Date(),
      sunAltitudeDeg: typeof sun?.sunAltitudeDeg === "number" ? sun.sunAltitudeDeg : undefined,
      dayLengthMinutes: typeof sun?.dayLengthMinutes === "number" ? sun.dayLengthMinutes : undefined,
      twilightPhase: typeof sun?.twilightPhase === "string" ? (sun.twilightPhase as "day" | "civil" | "nautical" | "astronomical" | "night") : undefined,
    });
    const seasonEntry = getSolarSeasonByIndex(computed.seasonIndex);
    solarSection = `Solar season:
- seasonIndex: ${computed.seasonIndex}
- archetype: ${computed.archetype}
- lonCenterDeg: ${computed.lonCenterDeg}
- declinationDeg: ${Math.round(computed.solarDeclinationDeg * 100) / 100}
- polarity: ${computed.seasonalPolarity}
- anchorType: ${seasonEntry?.anchorType ?? "none"}`;
    archetypeForAnalogue = computed.archetype as LigsArchetype;
  } else {
    solarSection = `Solar season: unknown (sunLonDeg / solarSeasonProfile not provided — do not invent)`;
    archetypeForAnalogue = FALLBACK_PRIMARY_ARCHETYPE as LigsArchetype;
  }

  const analogue = getCosmicAnalogue(archetypeForAnalogue);

  return `
------------------------------------------------------------
SOLAR SEASON + COSMIC ANALOGUE (GROUND TRUTH CONTEXT)
------------------------------------------------------------
${solarSection}

Cosmic analogue:
- phenomenon: ${analogue.phenomenon}
- description: ${analogue.description}
- light-behavior keywords: ${analogue.lightBehaviorKeywords.join(", ")}

Instruction: Use this context in RAW SIGNAL and ORACLE. FIELD SOLUTION will be inserted separately.
------------------------------------------------------------`;
}

/** Build (L) RESOLUTION KEYS preview for prompt — RAW SIGNAL bullets must cite these values. Each bullet ends with [key=value]. */
function buildResolutionKeysPreview(birthContext: unknown, archetype: string): string {
  const solarProfile = getSolarProfileFromContext(birthContext ?? {});
  const cosmicAnalogue = getCosmicAnalogue(archetype as LigsArchetype);
  const solarLine =
    solarProfile != null
      ? `${solarProfile.archetype} (index ${solarProfile.seasonIndex}, ${solarProfile.seasonalPolarity})`
      : "unknown";
  return `
------------------------------------------------------------
(L) RESOLUTION KEYS — RAW SIGNAL bullets must cite values; each bullet ends with exactly one [key=value]
------------------------------------------------------------
Regime:          ${archetype}
Solar season:    ${solarLine}
Cosmic analogue: ${cosmicAnalogue.phenomenon}
Coherence:       (computed after generation)

Vector Zero axes: lateral, vertical, depth (computed after generation)

------------------------------------------------------------
(L) ALLOWED CITATION KEYS — RAW SIGNAL [key=value] MUST use ONLY these keys
------------------------------------------------------------
ENVIRONMENT
  solar_altitude, solar_azimuth, twilight, sunrise_local, sunset_local, day_length_minutes, moon_phase, moon_illumination_pct, moon_altitude, moon_azimuth

SOLAR STRUCTURE
  sun_lon_deg, solar_season, solar_declination, solar_polarity, anchor_type

FIELD RESOLUTION
  regime, cosmic_analogue, vector_zero_coherence, vector_zero_axes_lateral, vector_zero_axes_vertical, vector_zero_axes_depth, primary_wavelength, secondary_wavelength

Each RAW SIGNAL bullet must end with exactly one [key=value] citation. Location/coordinates/timezone/timestamps stay in BOUNDARY but cannot be cited. No astrology-derived keys (sun_sign, moon_sign, rising_sign). If unknown, use "unknown". Inventing keys is FORBIDDEN.
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
  const solarCosmicBlock = buildSolarSeasonCosmicBlock(birthContext ?? {});
  content = content.trim() + solarCosmicBlock;
  const resolutionKeysPreview = buildResolutionKeysPreview(birthContext ?? {}, arch);
  content = content.trim() + resolutionKeysPreview;
  return content.trim() + "\n\n" + voiceBlock.trim();
}

export async function POST(request: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;
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
    let birthContext = (validation.value as Record<string, unknown>).birthContext as Record<string, unknown> | undefined;
    const idempotencyKey = (validation.value as Record<string, unknown>).idempotencyKey as string | undefined;

    // Upstream computation: always compute birthContext when birthDate + birthLocation + birthTime provided (ensures complete values, no placeholders)
    if (birthDate && birthLocation && birthTime) {
      try {
        const computed = await computeBirthContextForReport(birthDate, birthLocation, birthTime);
        birthContext = { ...computed, ...(birthContext && { onThisDay: (birthContext as Record<string, unknown>).onThisDay }) };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("error", "Birth context computation failed", { requestId, error: msg });
        // Development fallback: use LigsStudio default birth data when compute fails (e.g. geocoding rate limit)
        if (process.env.NODE_ENV !== "production") {
          log("warn", "Using LigsStudio fallback birth context", { requestId });
          birthContext = STUDIO_FALLBACK_BIRTH_CONTEXT;
        } else {
          return errorResponse(500, "Birth context computation failed. Please verify birth date, time, and location.", requestId);
        }
      }
    }

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
      const fullReport = `[DRY RUN] Full report placeholder for ${fullName}

1. INITIATION

RAW SIGNAL
Forces at ${birthDate} ${birthTime} in ${birthLocation}.

CUSTODIAN
Structural pattern formed at initialization.

ORACLE
The identity at rest before environmental modulation.

2. SPECTRAL ORIGIN

RAW SIGNAL
Spectral baseline.

CUSTODIAN
Biological encoding.

ORACLE
Baseline coherence.

3. TEMPORAL ENCODING

RAW SIGNAL
Temporal encoding.

CUSTODIAN
Circadian modulation.

ORACLE
Time and structure.

4. GRAVITATIONAL PATTERNING

RAW SIGNAL
Gravitational field.

CUSTODIAN
Physiological response.

ORACLE
Gravity and form.

5. DIRECTIONAL FIELD

RAW SIGNAL
Directional vectors.

CUSTODIAN
Spatial encoding.

ORACLE
Direction and meaning.

6. ARCHETYPE REVELATION

RAW SIGNAL
Archetype emergence.

CUSTODIAN
Pattern recognition.

ORACLE
Archetype and identity.

7. ARCHETYPE MICRO-PROFILES

RAW SIGNAL
Micro-profile data.

CUSTODIAN
Profile encoding.

ORACLE
Profile synthesis.

8. BEHAVIORAL EXPRESSION

RAW SIGNAL
Behavioral expression.

CUSTODIAN
Expression pathways.

ORACLE
Behavior and structure.

9. RELATIONAL FIELD

RAW SIGNAL
Relational vectors.

CUSTODIAN
Relational encoding.

ORACLE
Relation and meaning.

10. ENVIRONMENTAL RESONANCE

RAW SIGNAL
Environmental resonance.

CUSTODIAN
Environmental encoding.

ORACLE
Environment and structure.

11. COSMOLOGY OVERLAY

RAW SIGNAL
Cosmology overlay.

CUSTODIAN
Cosmology encoding.

ORACLE
Cosmology synthesis.

12. IDENTITY FIELD EQUATION

RAW SIGNAL
Identity field.

CUSTODIAN
Field encoding.

ORACLE
Identity equation.

13. LEGACY TRAJECTORY

RAW SIGNAL
Legacy trajectory.

CUSTODIAN
Trajectory encoding.

ORACLE
Legacy and structure.

14. INTEGRATION

RAW SIGNAL
Integration field.

CUSTODIAN
Integration pathways.

ORACLE
Integration synthesis.

(Set DRY_RUN=0 or remove the env var to generate real reports.)`;
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
      // Inject (L) deterministic blocks before save
      const fullReportWithBlocks = injectDeterministicBlocksIntoReport(fullReport, {
        birthContext: birthContext ?? {},
        vectorZero,
      });
      // Engine must never return success until saveReportAndConfirm verifies the write.
      const writeResult = await saveReportAndConfirm(
        reportId,
        {
          full_report: fullReportWithBlocks,
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
      const dryPayload = {
        reportId,
        full_report: fullReportWithBlocks,
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
        });
        return errorResponse(
          500,
          `Report failed validation: ${top.message}`,
          requestId
        );
      }
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
