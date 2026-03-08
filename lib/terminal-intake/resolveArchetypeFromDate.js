/**
 * Client-safe archetype resolution from birth date.
 * Mirrors getPrimaryArchetypeFromSolarLongitude from triangulatePrompt.
 * Same 12 × 30° segments; 0° = vernal equinox.
 */

import { approximateSunLongitudeFromDate } from "./approximateSunLongitude";
import { LIGS_ARCHETYPES } from "@/lib/archetypes";

/**
 * Resolve primary archetype from birth date string.
 * Uses approximate sun longitude; returns "Ignispectrum" if unparseable.
 */
export function resolveArchetypeFromDate(dateStr) {
  const sunLon = approximateSunLongitudeFromDate(dateStr);
  if (sunLon == null) return "Ignispectrum";
  const normalized = ((sunLon % 360) + 360) % 360;
  const index = Math.min(Math.floor(normalized / 30), 11);
  return LIGS_ARCHETYPES[index] ?? "Ignispectrum";
}
