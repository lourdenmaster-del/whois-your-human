/**
 * Report generation prompt builder for the engine. Extracted from route.ts
 * so route files only export valid Next.js handlers (POST, GET, etc.).
 */

import { getArchetypeOrFallback, FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";
import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { getSolarSeasonProfile, getSolarSeasonByIndex } from "@/src/ligs/astronomy/solarSeason";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import { getSolarProfileFromContext } from "@/lib/engine/deterministic-blocks";

const REPORT_BASE_PROMPT = `Generate the full field-resolution report and emotional snippet for this birth data (Engine v1.3.2 — 14-section structure, field-resolution document, observational only):

{{BIRTH_DATA}}

Output valid JSON only with exactly these keys: "full_report" (string, the complete 14-section field-resolution report: Initiation MUST begin with "(L) denotes the identity field..." law statement — then 14 sections. In EVERY section: RAW SIGNAL (max 3 bullets; each bullet must end with exactly one [key=value] citation from BOUNDARY/RESOLUTION KEYS/FIELD SOLUTION — one citation per bullet, no second citation in the same bullet, no uncited bullets), CUSTODIAN (max 2 bullets), ORACLE (1-2 lines). Max 18 words per sentence; each section under 90 words total. Use observational language only; no chakras, Kabbalah, mystical claims, or "Light Identity Grid System". Tone: mythic-scientific, elegant, readable. The full_report must be a complete string.) and "emotional_snippet" (string, 1-2 declarative sentences). No other text.`;

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
(L) RESOLUTION KEYS — RAW SIGNAL bullets must cite values; each bullet ends with exactly one [key=value] (one citation per bullet only; no second citation in the same bullet)
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

Each RAW SIGNAL bullet must end with exactly one [key=value] citation. One citation per bullet only — do not add a second [key=value] in the same bullet. Every RAW SIGNAL bullet must be cited; no uncited bullets. Location/coordinates/timezone/timestamps stay in BOUNDARY but cannot be cited. No astrology-derived keys (sun_sign, moon_sign, rising_sign). If unknown, use "unknown". Inventing keys is FORBIDDEN.
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
