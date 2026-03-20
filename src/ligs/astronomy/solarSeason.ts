/**
 * 12 solar seasonal light segments — physics-derived for glyph geometry mapping.
 * Uses ecliptic longitude (0° = vernal equinox), obliquity, and local light regime.
 */

import type { LigsArchetype } from "../voice/schema";
import { LIGS_ARCHETYPES } from "../archetypes/contract";

/** Obliquity of the ecliptic (degrees). */
const OBLIQUITY_DEG = 23.436;

export type SolarSeasonAnchorType = "equinox" | "solstice" | "crossquarter" | "none";

export interface SolarSeasonEntry {
  index: number;
  archetype: LigsArchetype;
  lonStartDeg: number;
  lonEndDeg: number;
  lonCenterDeg: number;
  anchorType: SolarSeasonAnchorType;
}

/** Canonical 12-season dataset. */
export const SOLAR_SEASONS: readonly SolarSeasonEntry[] = [
  { index: 0, archetype: "Ignispectrum", lonStartDeg: 0, lonEndDeg: 30, lonCenterDeg: 15, anchorType: "equinox" },
  { index: 1, archetype: "Stabiliora", lonStartDeg: 30, lonEndDeg: 60, lonCenterDeg: 45, anchorType: "crossquarter" },
  { index: 2, archetype: "Duplicaris", lonStartDeg: 60, lonEndDeg: 90, lonCenterDeg: 75, anchorType: "none" },
  { index: 3, archetype: "Tenebris", lonStartDeg: 90, lonEndDeg: 120, lonCenterDeg: 105, anchorType: "solstice" },
  { index: 4, archetype: "Radiantis", lonStartDeg: 120, lonEndDeg: 150, lonCenterDeg: 135, anchorType: "crossquarter" },
  { index: 5, archetype: "Precisura", lonStartDeg: 150, lonEndDeg: 180, lonCenterDeg: 165, anchorType: "none" },
  { index: 6, archetype: "Aequilibris", lonStartDeg: 180, lonEndDeg: 210, lonCenterDeg: 195, anchorType: "equinox" },
  { index: 7, archetype: "Obscurion", lonStartDeg: 210, lonEndDeg: 240, lonCenterDeg: 225, anchorType: "crossquarter" },
  { index: 8, archetype: "Vectoris", lonStartDeg: 240, lonEndDeg: 270, lonCenterDeg: 255, anchorType: "none" },
  { index: 9, archetype: "Structoris", lonStartDeg: 270, lonEndDeg: 300, lonCenterDeg: 285, anchorType: "solstice" },
  { index: 10, archetype: "Innovaris", lonStartDeg: 300, lonEndDeg: 330, lonCenterDeg: 315, anchorType: "crossquarter" },
  { index: 11, archetype: "Fluxionis", lonStartDeg: 330, lonEndDeg: 360, lonCenterDeg: 345, anchorType: "none" },
] as const;

export type TwilightPhase = "day" | "civil" | "nautical" | "astronomical" | "night";

export interface SolarSeasonProfile {
  seasonIndex: number;
  archetype: LigsArchetype;
  lonCenterDeg: number;
  solarDeclinationDeg: number;
  declinationAbs: number;
  seasonalPolarity: "waxing" | "waning";
  insolationProxy01: number;
  twilightClass: TwilightPhase;
  dayLengthNorm01: number | null;
}

function altitudeToTwilightPhase(altDeg: number): TwilightPhase {
  if (altDeg >= 0) return "day";
  if (altDeg >= -6) return "civil";
  if (altDeg >= -12) return "nautical";
  if (altDeg >= -18) return "astronomical";
  return "night";
}

/**
 * Solar declination from ecliptic longitude: δ = arcsin(sin(λ) · sin(ε)).
 * Units: degrees.
 */
export function eclipticLongitudeToDeclination(lonDeg: number): number {
  const lonRad = (lonDeg * Math.PI) / 180;
  const oblRad = (OBLIQUITY_DEG * Math.PI) / 180;
  const sinDec = Math.sin(lonRad) * Math.sin(oblRad);
  return (Math.asin(Math.max(-1, Math.min(1, sinDec))) * 180) / Math.PI;
}

/** Normalize longitude to [0, 360). */
function normalizeLon(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

/**
 * Canonical solar season index (0–11) from ecliptic longitude.
 * Single source of truth: matches SOLAR_SEASONS boundaries [0,30), [30,60), … [330,360).
 * Use this everywhere segment index is needed from longitude.
 */
export function getSolarSeasonIndexFromLongitude(lonDeg: number): number {
  const normalized = normalizeLon(lonDeg);
  return Math.min(Math.floor(normalized / 30), 11);
}

/** Day length normalization: mid-latitude range ~360–960 min → 0..1. */
function dayLengthToNorm01(min: number): number {
  const MIN = 360; // ~6 h
  const MAX = 960; // ~16 h
  return Math.max(0, Math.min(1, (min - MIN) / (MAX - MIN)));
}

export function getSolarSeasonProfile(params: {
  sunLonDeg: number;
  latitudeDeg: number;
  date: Date;
  sunAltitudeDeg?: number;
  dayLengthMinutes?: number;
  twilightPhase?: TwilightPhase;
}): SolarSeasonProfile {
  const {
    sunLonDeg,
    sunAltitudeDeg,
    dayLengthMinutes,
    twilightPhase: twilightPhaseIn,
  } = params;

  const normalized = normalizeLon(sunLonDeg);
  const seasonIndex = getSolarSeasonIndexFromLongitude(sunLonDeg);
  const entry = SOLAR_SEASONS[seasonIndex]!;
  const lonCenterDeg = entry.lonCenterDeg;

  const solarDeclinationDeg = eclipticLongitudeToDeclination(normalized);
  const declinationAbs = Math.abs(solarDeclinationDeg);

  const seasonalPolarity: "waxing" | "waning" =
    normalized >= 0 && normalized < 180 ? "waxing" : "waning";

  // insolationProxy01: 0 at equinox, 1 at solstice. Based on declinationAbs.
  const maxDecl = OBLIQUITY_DEG;
  let insolationProxy01 = declinationAbs / maxDecl;
  if (sunAltitudeDeg != null) {
    // Blend with altitude: higher altitude → more insolation proxy weight
    const altNorm = Math.max(0, Math.min(1, (sunAltitudeDeg + 18) / 36)); // -18..18 → 0..1
    insolationProxy01 = insolationProxy01 * 0.7 + altNorm * 0.3;
  }
  insolationProxy01 = Math.max(0, Math.min(1, insolationProxy01));

  let twilightClass: TwilightPhase;
  if (twilightPhaseIn != null) {
    twilightClass = twilightPhaseIn;
  } else if (sunAltitudeDeg != null) {
    twilightClass = altitudeToTwilightPhase(sunAltitudeDeg);
  } else {
    twilightClass = "day";
  }

  const dayLengthNorm01: number | null =
    dayLengthMinutes != null ? dayLengthToNorm01(dayLengthMinutes) : null;

  return {
    seasonIndex,
    archetype: entry.archetype,
    lonCenterDeg,
    solarDeclinationDeg,
    declinationAbs,
    seasonalPolarity,
    insolationProxy01,
    twilightClass,
    dayLengthNorm01,
  };
}

export function getSolarSeasonByIndex(index: number): SolarSeasonEntry | undefined {
  return SOLAR_SEASONS[index];
}

/** Get solar season entry by archetype name (for exemplar backfill). */
export function getSolarSeasonForArchetype(archetype: string): SolarSeasonEntry | undefined {
  return SOLAR_SEASONS.find((s) => s.archetype === archetype);
}
