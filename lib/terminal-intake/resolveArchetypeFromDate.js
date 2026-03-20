/**
 * Client-safe archetype resolution from birth date.
 * Mirrors getPrimaryArchetypeFromSolarLongitude from triangulatePrompt.
 * Same 12 × 30° segments; 0° = vernal equinox.
 */

import { approximateSunLongitudeFromDate } from "./approximateSunLongitude";
import { LIGS_ARCHETYPES } from "@/lib/archetypes";
import { getSolarSeasonIndexFromLongitude } from "@/src/ligs/astronomy/solarSeason";

/**
 * Solar segment index 0–11 from date. Segment is defined by date; archetype by segment.
 * Use this to resolve base archetype from date alone (no time/place required).
 */
export function getArchetypeAndSegmentFromDate(dateStr) {
  const sunLon = approximateSunLongitudeFromDate(dateStr);
  if (sunLon == null) return { archetype: "Ignispectrum", segmentIndex: 0 };
  const segmentIndex = getSolarSeasonIndexFromLongitude(sunLon);
  const archetype = LIGS_ARCHETYPES[segmentIndex] ?? "Ignispectrum";
  return { archetype, segmentIndex };
}

/**
 * Resolve primary archetype from birth date string.
 * Uses approximate sun longitude; returns "Ignispectrum" if unparseable.
 */
export function resolveArchetypeFromDate(dateStr) {
  const { archetype } = getArchetypeAndSegmentFromDate(dateStr);
  return archetype;
}
