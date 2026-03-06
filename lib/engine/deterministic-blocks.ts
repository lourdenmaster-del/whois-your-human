/**
 * Deterministic report blocks — injected after LLM call.
 * (L) BOUNDARY CONDITIONS, (L) FIELD SOLUTION, (L) LIGHT IDENTITY SUMMARY.
 * Only fields that exist in birthContext / solarSeasonProfile / cosmicAnalogue / vectorZero today.
 */

import type { VectorZero } from "@/lib/vector-zero";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import { getSolarSeasonProfile, getSolarSeasonByIndex } from "@/src/ligs/astronomy/solarSeason";
import type { LigsArchetype } from "@/src/ligs/voice/schema";

/** Build (L) BOUNDARY CONDITIONS block. Always renders; uses "unknown" for missing values. */
export function buildBoundaryConditionsBlock(birthContext: unknown): string {
  const c = birthContext != null && typeof birthContext === "object" ? (birthContext as Record<string, unknown>) : {};
  const lines: string[] = [];

  const placeName = c.placeName ?? c.birthLocation;
  const lat = c.lat;
  const lon = c.lon;
  if (placeName && typeof lat === "number" && typeof lon === "number") {
    const latStr = lat >= 0 ? `${lat.toFixed(4)}°N` : `${(-lat).toFixed(4)}°S`;
    const lonStr = lon >= 0 ? `${lon.toFixed(4)}°E` : `${(-lon).toFixed(4)}°W`;
    lines.push(`Location:     ${placeName}`);
    lines.push(`Coordinates:  ${latStr}, ${lonStr}`);
  } else {
    lines.push(`Location:     ${typeof placeName === "string" ? placeName : "unknown"}`);
    lines.push(`Coordinates:  unknown`);
  }

  lines.push(`Timezone:     ${typeof c.timezoneId === "string" ? c.timezoneId : "unknown"}`);
  lines.push(`Local:        ${typeof c.localTimestamp === "string" ? c.localTimestamp : "unknown"}`);
  lines.push(`UTC:          ${typeof c.utcTimestamp === "string" ? c.utcTimestamp : "unknown"}`);

  const sun = c.sun as Record<string, unknown> | undefined;
  lines.push("");
  lines.push("Sun:");
  if (sun && typeof sun === "object" && Object.keys(sun).length > 0) {
    lines.push(`  Altitude:   ${typeof sun.sunAltitudeDeg === "number" ? sun.sunAltitudeDeg + "°" : "unknown"}`);
    lines.push(`  Azimuth:    ${typeof sun.sunAzimuthDeg === "number" ? sun.sunAzimuthDeg + "°" : "unknown"}`);
    lines.push(`  Twilight:   ${typeof sun.twilightPhase === "string" ? sun.twilightPhase : "unknown"}`);
    lines.push(`  Sunrise:    ${typeof sun.sunriseLocal === "string" ? sun.sunriseLocal : "unknown"}`);
    lines.push(`  Sunset:     ${typeof sun.sunsetLocal === "string" ? sun.sunsetLocal : "unknown"}`);
    lines.push(`  Day length: ${typeof sun.dayLengthMinutes === "number" ? sun.dayLengthMinutes + " min" : "unknown"}`);
  } else {
    lines.push(`  Altitude:   unknown`);
    lines.push(`  Azimuth:    unknown`);
    lines.push(`  Twilight:   unknown`);
    lines.push(`  Sunrise:    unknown`);
    lines.push(`  Sunset:     unknown`);
    lines.push(`  Day length: unknown`);
  }

  const moon = c.moon as Record<string, unknown> | undefined;
  lines.push("");
  lines.push("Moon:");
  if (moon && typeof moon === "object" && Object.keys(moon).length > 0) {
    lines.push(`  Phase:        ${typeof moon.phaseName === "string" ? moon.phaseName : "unknown"}`);
    lines.push(`  Illumination: ${typeof moon.illuminationFrac === "number" ? Math.round(moon.illuminationFrac * 100) + "%" : "unknown"}`);
    if (typeof moon.moonAltitudeDeg === "number" && typeof moon.moonAzimuthDeg === "number") {
      lines.push(`  Altitude:     ${moon.moonAltitudeDeg}°, Azimuth: ${moon.moonAzimuthDeg}°`);
    } else {
      lines.push(`  Altitude:     unknown, Azimuth: unknown`);
    }
  } else {
    lines.push(`  Phase:        unknown`);
    lines.push(`  Illumination: unknown`);
  }

  if (typeof c.sun_sign === "string" && typeof c.moon_sign === "string" && typeof c.rising_sign === "string") {
    lines.push("");
    lines.push(`Computed ecliptic: Sun ${c.sun_sign}, Moon ${c.moon_sign}, Rising ${c.rising_sign}`);
  } else {
    lines.push("");
    lines.push(`Computed ecliptic: unknown`);
  }

  const onThisDay = c.onThisDay as { items?: Array<{ year: number; text: string }> } | undefined;
  if (onThisDay && Array.isArray(onThisDay.items) && onThisDay.items.length > 0) {
    lines.push("");
    lines.push("On this date (world history context):");
    for (const it of onThisDay.items) {
      if (typeof it?.text === "string") {
        const y = typeof it?.year === "number" ? it.year : 0;
        lines.push(y ? `  • ${y} — ${it.text}` : `  • ${it.text}`);
      }
    }
  }

  return `
------------------------------------------------------------
(L) BOUNDARY CONDITIONS — measured values (no interpretation)
------------------------------------------------------------
${lines.join("\n")}

If the entered time is approximate, solar altitude/azimuth may shift modestly; the regime is derived from the provided input.
------------------------------------------------------------`;
}

export interface SolarProfileForBlock {
  seasonIndex: number;
  archetype: string;
  lonCenterDeg: number;
  solarDeclinationDeg: number;
  seasonalPolarity: string;
  anchorType?: string;
}

/** Build (L) FIELD SOLUTION block from solar season + cosmic analogue. */
export function buildFieldSolutionBlock(
  profile: SolarProfileForBlock,
  cosmicAnalogue: { phenomenon: string; description: string; lightBehaviorKeywords: string[] }
): string {
  const anchorStr = profile.anchorType ?? "none";
  const declRounded = Math.round(profile.solarDeclinationDeg * 100) / 100;
  return `
------------------------------------------------------------
(L) FIELD SOLUTION — resolved regime
------------------------------------------------------------
Solar season:
  Season:     ${profile.archetype} (index ${profile.seasonIndex})
  Longitude:  ${profile.lonCenterDeg}° ecliptic
  Declination: ${declRounded}°
  Polarity:   ${profile.seasonalPolarity}
  Anchor:     ${anchorStr}

Cosmic analogue:
  Phenomenon: ${cosmicAnalogue.phenomenon}
  Description: ${cosmicAnalogue.description}
  Keywords:   ${cosmicAnalogue.lightBehaviorKeywords.join(", ")}
------------------------------------------------------------`;
}

/** Build (L) LIGHT IDENTITY SUMMARY card. */
export function buildLightIdentitySummaryBlock(
  archetype: string,
  solarProfile: SolarProfileForBlock | null,
  cosmicAnalogue: { phenomenon: string },
  vectorZero: VectorZero
): string {
  const sym = vectorZero.symmetry_profile;
  const solarLine =
    solarProfile != null
      ? `${solarProfile.archetype} (index ${solarProfile.seasonIndex}, ${solarProfile.seasonalPolarity})`
      : "unknown";
  return `
------------------------------------------------------------
(L) LIGHT IDENTITY SUMMARY
------------------------------------------------------------
Archetype:        ${archetype}
Solar season:     ${solarLine}
Cosmic analogue:  ${cosmicAnalogue.phenomenon}

Wavelength bands:
  primary:   ${vectorZero.primary_wavelength || "unknown"}
  secondary: ${vectorZero.secondary_wavelength || "unknown"}

Vector Zero axes:
  lateral:  ${sym.lateral.toFixed(2)}
  vertical: ${sym.vertical.toFixed(2)}
  depth:    ${sym.depth.toFixed(2)}

Coherence score:  ${vectorZero.coherence_score.toFixed(2)}
------------------------------------------------------------`;
}

/** Build (L) RESOLUTION KEYS block — compact reference for RAW SIGNAL bullets to cite. Injected after LIGHT IDENTITY SUMMARY. */
export function buildResolutionKeysBlock(
  archetype: string,
  solarProfile: SolarProfileForBlock | null,
  cosmicAnalogue: { phenomenon: string },
  vectorZero: VectorZero
): string {
  const solarLine =
    solarProfile != null
      ? `${solarProfile.archetype} (index ${solarProfile.seasonIndex}, ${solarProfile.seasonalPolarity})`
      : "unknown";
  const coh = vectorZero.coherence_score.toFixed(2);
  const sym = vectorZero.symmetry_profile;
  return `
------------------------------------------------------------
(L) RESOLUTION KEYS — cite these in RAW SIGNAL bullets
------------------------------------------------------------
Regime:          ${archetype}
Solar season:    ${solarLine}
Cosmic analogue: ${cosmicAnalogue.phenomenon}
Coherence:       ${coh}

Vector Zero axes:
  lateral:  ${sym.lateral.toFixed(2)}
  vertical: ${sym.vertical.toFixed(2)}
  depth:    ${sym.depth.toFixed(2)}
------------------------------------------------------------`;
}

/** Keys for RAW SIGNAL citations. location/coordinates/timezone/timestamps stay in BOUNDARY but cannot be cited. No astrology-derived keys. */
const ALLOWED_CITATION_KEYS_GROUPED = {
  ENVIRONMENT: ["solar_altitude", "solar_azimuth", "twilight", "sunrise_local", "sunset_local", "day_length_minutes", "moon_phase", "moon_illumination_pct", "moon_altitude", "moon_azimuth"],
  SOLAR_STRUCTURE: ["sun_lon_deg", "solar_season", "solar_declination", "solar_polarity", "anchor_type"],
  FIELD_RESOLUTION: ["regime", "cosmic_analogue", "vector_zero_coherence", "vector_zero_axes_lateral", "vector_zero_axes_vertical", "vector_zero_axes_depth", "primary_wavelength", "secondary_wavelength"],
};

export const ALLOWED_CITATION_KEYS: readonly string[] = [
  ...ALLOWED_CITATION_KEYS_GROUPED.ENVIRONMENT,
  ...ALLOWED_CITATION_KEYS_GROUPED.SOLAR_STRUCTURE,
  ...ALLOWED_CITATION_KEYS_GROUPED.FIELD_RESOLUTION,
];

/** Build (L) ALLOWED CITATION KEYS block — injected after RESOLUTION KEYS. RAW SIGNAL must use ONLY these keys. */
export function buildAllowedCitationKeysBlock(): string {
  const env = ALLOWED_CITATION_KEYS_GROUPED.ENVIRONMENT.join(", ");
  const solar = ALLOWED_CITATION_KEYS_GROUPED.SOLAR_STRUCTURE.join(", ");
  const field = ALLOWED_CITATION_KEYS_GROUPED.FIELD_RESOLUTION.join(", ");
  return `
------------------------------------------------------------
(L) ALLOWED CITATION KEYS — RAW SIGNAL [key=value] MUST use ONLY these keys
------------------------------------------------------------
ENVIRONMENT
  ${env}

SOLAR STRUCTURE
  ${solar}

FIELD RESOLUTION
  ${field}

Each RAW SIGNAL bullet must end with exactly one [key=value] citation. If unknown, use "unknown". Inventing keys is FORBIDDEN.
------------------------------------------------------------`;
}

/** Inject deterministic blocks into full_report after LLM. Order: LIGHT IDENTITY SUMMARY after §1, RESOLUTION KEYS, ALLOWED CITATION KEYS, BOUNDARY CONDITIONS at §2, FIELD SOLUTION before §6. */
export function injectDeterministicBlocksIntoReport(
  fullReport: string,
  opts: {
    birthContext: unknown;
    vectorZero: VectorZero | undefined;
  }
): string {
  const { birthContext, vectorZero } = opts;
  const boundaryBlock = buildBoundaryConditionsBlock(birthContext);
  const solarProfile = getSolarProfileFromContext(birthContext ?? {});
  const archetypeForCosmic = solarProfile?.archetype ?? "Stabiliora";
  const cosmicAnalogue = getCosmicAnalogue(archetypeForCosmic as LigsArchetype);
  const fieldBlock =
    solarProfile != null ? buildFieldSolutionBlock(solarProfile, cosmicAnalogue) : "";
  // Canonical regime: upstream solarProfile only. RESOLUTION KEYS Regime is source of truth for validation.
  const archetypeForSummary = solarProfile?.archetype ?? "Stabiliora";
  const summaryBlock =
    vectorZero != null
      ? buildLightIdentitySummaryBlock(archetypeForSummary, solarProfile ?? null, cosmicAnalogue, vectorZero)
      : "";

  let result = fullReport;

  // 1. Insert (L) LIGHT IDENTITY SUMMARY, (L) RESOLUTION KEYS, (L) ALLOWED CITATION KEYS after Section 1 (INITIATION), before Section 2
  if (summaryBlock && vectorZero != null) {
    const resolutionKeysBlock = buildResolutionKeysBlock(
      archetypeForSummary,
      solarProfile ?? null,
      cosmicAnalogue,
      vectorZero
    );
    const allowedKeysBlock = buildAllowedCitationKeysBlock();
    const afterInit = result.match(/([\s\S]*?)(\n\s*2\.\s+Spectral\s+Origin[\s\S]*)/i);
    if (afterInit) {
      result = afterInit[1]! + summaryBlock + "\n\n" + resolutionKeysBlock + "\n\n" + allowedKeysBlock + "\n\n" + afterInit[2]!;
    }
  } else if (summaryBlock) {
    const afterInit = result.match(/([\s\S]*?)(\n\s*2\.\s+Spectral\s+Origin[\s\S]*)/i);
    if (afterInit) {
      result = afterInit[1]! + summaryBlock + "\n\n" + afterInit[2]!;
    }
  }

  // 2. Insert (L) BOUNDARY CONDITIONS at start of Section 2 content (always render)
  const sect2 = result.match(/(\n\s*2\.\s+Spectral\s+Origin\s*\n)([\s\S]*?)(?=\n\s*3\.\s+Temporal|$)/i);
  if (sect2) {
    result = result.replace(sect2[0]!, sect2[1]! + boundaryBlock + "\n\n" + sect2[2]!);
  }

  // 3. Insert (L) FIELD SOLUTION before Section 6
  if (fieldBlock) {
    const beforeSect6 = result.match(/([\s\S]*?)(\n\s*6\.\s+Archetype\s+Revelation[\s\S]*)/i);
    if (beforeSect6) {
      result = beforeSect6[1]! + fieldBlock + "\n\n" + beforeSect6[2]!;
    }
  }

  // 4. Add section anchoring line at start of sections 2–14
  const anchorArchetype = archetypeForSummary;
  const anchorScore = vectorZero?.coherence_score != null ? vectorZero.coherence_score.toFixed(2) : "unknown";
  const anchorLine = `Field reference: (L) resolved as ${anchorArchetype} with Vector Zero coherence ${anchorScore}.\n\n`;
  for (let n = 2; n <= 14; n++) {
    const title =
      n === 2 ? "Spectral\\s+Origin" :
      n === 3 ? "Temporal\\s+Encoding" :
      n === 4 ? "Gravitational\\s+Patterning" :
      n === 5 ? "Directional\\s+Field" :
      n === 6 ? "Archetype\\s+Revelation" :
      n === 7 ? "Archetype\\s+Micro-Profiles" :
      n === 8 ? "Behavioral\\s+Expression" :
      n === 9 ? "Relational\\s+Field" :
      n === 10 ? "Environmental\\s+Resonance" :
      n === 11 ? "Cosmology\\s+Overlay" :
      n === 12 ? "Identity\\s+Field\\s+Equation" :
      n === 13 ? "Legacy\\s+Trajectory" :
      "Integration";
    const re = new RegExp(`(\\n\\s*${n}\\.\\s*${title}\\s*\\n)(?=[\\s\\S])`, "i");
    result = result.replace(re, `$1${anchorLine}`);
  }

  return result;
}

/** Get solar profile from birthContext. Returns null when solarSeasonProfile and sunLonDeg are missing — never invents values. */
export function getSolarProfileFromContext(birthContext: unknown): SolarProfileForBlock | null {
  const c = birthContext as Record<string, unknown> | undefined;
  if (!c) return null;
  const precomputed = c?.solarSeasonProfile as Record<string, unknown> | undefined;
  if (
    precomputed &&
    typeof precomputed.seasonIndex === "number" &&
    typeof precomputed.archetype === "string" &&
    typeof precomputed.lonCenterDeg === "number" &&
    typeof precomputed.solarDeclinationDeg === "number" &&
    typeof precomputed.seasonalPolarity === "string"
  ) {
    const entry = getSolarSeasonByIndex(precomputed.seasonIndex as number);
    return {
      seasonIndex: precomputed.seasonIndex as number,
      archetype: precomputed.archetype as string,
      lonCenterDeg: precomputed.lonCenterDeg as number,
      solarDeclinationDeg: precomputed.solarDeclinationDeg as number,
      seasonalPolarity: precomputed.seasonalPolarity as string,
      anchorType: (precomputed.anchorType as string) ?? entry?.anchorType ?? "none",
    };
  }
  const sunLonDeg = c?.sunLonDeg;
  if (typeof sunLonDeg !== "number") return null;
  const lat = typeof c?.lat === "number" ? c.lat : 0;
  const utcTimestamp = typeof c?.utcTimestamp === "string" ? c.utcTimestamp : "";
  const sun = c?.sun as Record<string, unknown> | undefined;
  const computed = getSolarSeasonProfile({
    sunLonDeg,
    latitudeDeg: lat,
    date: utcTimestamp ? new Date(utcTimestamp) : new Date(),
    sunAltitudeDeg: typeof sun?.sunAltitudeDeg === "number" ? sun.sunAltitudeDeg : undefined,
    dayLengthMinutes: typeof sun?.dayLengthMinutes === "number" ? sun.dayLengthMinutes : undefined,
    twilightPhase: typeof sun?.twilightPhase === "string" ? (sun.twilightPhase as "day" | "civil" | "nautical" | "astronomical" | "night") : undefined,
  });
  const entry = getSolarSeasonByIndex(computed.seasonIndex);
  return {
    seasonIndex: computed.seasonIndex,
    archetype: computed.archetype,
    lonCenterDeg: computed.lonCenterDeg,
    solarDeclinationDeg: computed.solarDeclinationDeg,
    seasonalPolarity: computed.seasonalPolarity,
    anchorType: entry?.anchorType ?? "none",
  };
}
