/**
 * Resolve Magnetic Field Index, Climate Signature, and Sensory Field Conditions
 * from birth context and live lookups. Used at report generation time; results
 * are persisted so paid WHOIS can render without re-fetching.
 *
 * Operational definitions: see definitions.ts.
 */

import { fetchGeomagneticKp } from "./fetchGeomagneticKp";
import { fetchWeatherAtMoment } from "./fetchWeatherAtMoment";
import {
  formatMagneticFieldIndexDisplay,
  formatClimateSignatureDisplay,
  formatSensoryFieldConditionsDisplay,
} from "./formatFieldDisplays";

export type ResolvedFieldConditions = {
  magneticFieldIndexDisplay: string | null;
  climateSignatureDisplay: string | null;
  sensoryFieldConditionsDisplay: string | null;
};

export type ResolveFieldConditionsOptions = {
  /** When true, skip external API calls (e.g. DRY_RUN). All three displays will be null. */
  skipExternalLookups?: boolean;
};

/** Valid ISO date string (YYYY-MM-DD) for climate fallback. */
function dateStrFromContext(birthContext: Record<string, unknown>): string | null {
  const utc = birthContext.utcTimestamp as string | undefined;
  if (typeof utc === "string" && /^\d{4}-\d{2}-\d{2}/.test(utc)) return utc.slice(0, 10);
  const birthDate = birthContext.birthDate as string | undefined;
  if (typeof birthDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(birthDate)) return birthDate.slice(0, 10);
  return null;
}

/**
 * Resolve the three field-conditions display strings for a birth moment.
 * - Magnetic: GFZ then SWPC Kp when available for the UTC time.
 * - Climate: Open-Meteo + lat/date; fallback to lat + month when weather fails.
 * - Sensory: Sun (day/night) + weather; fallback to sun only when weather fails.
 * Always returns an object; never throws. Missing or failed lookups yield null for that field.
 */
export async function resolveFieldConditionsForBirth(
  birthContext: Record<string, unknown>,
  options: ResolveFieldConditionsOptions = {}
): Promise<ResolvedFieldConditions> {
  const { skipExternalLookups = false } = options;
  const result: ResolvedFieldConditions = {
    magneticFieldIndexDisplay: null,
    climateSignatureDisplay: null,
    sensoryFieldConditionsDisplay: null,
  };

  if (skipExternalLookups) return result;

  const utcTimestamp = birthContext.utcTimestamp as string | undefined;
  const lat = birthContext.lat as number | undefined;
  const lon = birthContext.lon as number | undefined;
  const sun = birthContext.sun as Record<string, unknown> | undefined;
  const hasValidCoords = typeof lat === "number" && typeof lon === "number";
  const hasValidUtc =
    typeof utcTimestamp === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(utcTimestamp) &&
    !Number.isNaN(new Date(utcTimestamp).getTime());

  if (!hasValidCoords) return result;

  const dateStr = hasValidUtc ? utcTimestamp.slice(0, 10) : dateStrFromContext(birthContext);

  try {
    let kpResult: Awaited<ReturnType<typeof fetchGeomagneticKp>> = null;
    let weather: Awaited<ReturnType<typeof fetchWeatherAtMoment>> = null;

    if (hasValidUtc) {
      console.log("resolveFieldConditionsForBirth: calling fetchGeomagneticKp", { utcTimestamp: utcTimestamp.slice(0, 19) });
      try {
        kpResult = await fetchGeomagneticKp(utcTimestamp);
        console.log("resolveFieldConditionsForBirth: fetchGeomagneticKp result", kpResult != null ? { kpIndex: kpResult.kpIndex, source: kpResult.source } : "null");
      } catch (e) {
        console.error("resolveFieldConditionsForBirth: fetchGeomagneticKp threw", e);
      }
      console.log("resolveFieldConditionsForBirth: calling fetchWeatherAtMoment", { lat, lon, utcTimestamp: utcTimestamp.slice(0, 19) });
      try {
        weather = await fetchWeatherAtMoment(lat, lon, utcTimestamp);
        console.log("resolveFieldConditionsForBirth: fetchWeatherAtMoment result", weather != null ? "ok" : "null");
      } catch (e) {
        console.error("resolveFieldConditionsForBirth: fetchWeatherAtMoment threw", e);
      }
    } else {
      console.log("resolveFieldConditionsForBirth: skipping external lookups (invalid utcTimestamp)", { utcTimestamp });
    }

    result.magneticFieldIndexDisplay = formatMagneticFieldIndexDisplay(kpResult);
    result.climateSignatureDisplay = formatClimateSignatureDisplay(
      lat,
      dateStr ?? "",
      weather
    );
    result.sensoryFieldConditionsDisplay = formatSensoryFieldConditionsDisplay(
      sun
        ? {
            sunAboveHorizon: sun.sunAboveHorizon as boolean | undefined,
            twilightPhase: sun.twilightPhase as string | undefined,
          }
        : null,
      weather
    );
  } catch (err) {
    console.error("resolveFieldConditionsForBirth: unexpected error", err);
  }

  return result;
}
