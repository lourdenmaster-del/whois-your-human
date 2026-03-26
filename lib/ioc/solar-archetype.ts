/**
 * IOC-owned solar segment → primary archetype (Pascal case).
 * Boundaries match former LIGS solar seasons: 12 × 30° from vernal equinox.
 */

export type IocSolarArchetypePascal =
  | "Ignispectrum"
  | "Stabiliora"
  | "Duplicaris"
  | "Tenebris"
  | "Radiantis"
  | "Precisura"
  | "Aequilibris"
  | "Obscurion"
  | "Vectoris"
  | "Structoris"
  | "Innovaris"
  | "Fluxionis";

/** Order index 0–11 = solar season from longitude. */
export const IOC_SOLAR_ARCHETYPE_PASCAL: readonly IocSolarArchetypePascal[] = [
  "Ignispectrum",
  "Stabiliora",
  "Duplicaris",
  "Tenebris",
  "Radiantis",
  "Precisura",
  "Aequilibris",
  "Obscurion",
  "Vectoris",
  "Structoris",
  "Innovaris",
  "Fluxionis",
] as const;

function normalizeLon(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

export function getSolarSeasonIndexFromLongitude(lonDeg: number): number {
  const normalized = normalizeLon(lonDeg);
  return Math.min(Math.floor(normalized / 30), 11);
}

export function getPrimaryArchetypePascalFromSolarLongitude(sunLonDeg: number): IocSolarArchetypePascal {
  const index = getSolarSeasonIndexFromLongitude(sunLonDeg);
  return IOC_SOLAR_ARCHETYPE_PASCAL[index]!;
}
