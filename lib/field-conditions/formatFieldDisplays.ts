/**
 * Deterministic formatting of field-conditions values into release-facing Genesis display strings.
 * No hardcoded examples; all wording derived from actual values and stable rules.
 */

import type { GeomagneticKpResult } from "./fetchGeomagneticKp";
import type { WeatherAtMoment } from "./fetchWeatherAtMoment";

/** Kp 0–1: quiet; 2: unsettled; 3: active; 4: storm; 5+: major storm. */
export function formatMagneticFieldIndexDisplay(kp: GeomagneticKpResult | null): string | null {
  if (!kp) return null;
  const k = kp.kpIndex;
  if (k <= 1) return "Quiet geomagnetic conditions";
  if (k === 2) return "Unsettled geomagnetic conditions";
  if (k === 3) return `K-index ${k} (moderate)`;
  if (k === 4) return `K-index ${k} (active)`;
  if (k >= 5) return `K-index ${k} (storm conditions)`;
  return `K-index ${k}`;
}

/**
 * Climate signature: season + thermal regime + humidity hint from lat + month + weather.
 * Concise institutional label.
 */
export function formatClimateSignatureDisplay(
  lat: number,
  dateStr: string,
  weather: WeatherAtMoment | null
): string | null {
  const month = parseInt(dateStr.slice(5, 7), 10);
  if (Number.isNaN(month) || month < 1 || month > 12) return null;
  const season =
    month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 11 ? "autumn" : "winter";
  const absLat = Math.abs(lat);
  const thermal =
    absLat > 55 ? "Cold" : absLat > 35 ? "Temperate" : absLat > 20 ? "Warm" : "Tropical";
  let thermalLabel = thermal;
  if (weather) {
    const t = weather.temperatureC;
    if (t <= 0) thermalLabel = "Cold";
    else if (t <= 10) thermalLabel = "Cool";
    else if (t <= 20) thermalLabel = "Mild";
    else if (t <= 30) thermalLabel = "Warm";
    else thermalLabel = "Hot";
  }
  const humidityHint =
    weather && weather.humidityPct >= 70 ? " humid" : weather && weather.humidityPct <= 30 ? " dry" : "";
  const regime = `${thermalLabel}${humidityHint} ${season}`.trim();
  return regime ? `${regime} conditions` : null;
}

/**
 * Sensory field conditions: day/night + thermal + humidity + cloud + precip + wind.
 * Concise human-facing list.
 */
export function formatSensoryFieldConditionsDisplay(
  sun: { sunAboveHorizon?: boolean; twilightPhase?: string } | null,
  weather: WeatherAtMoment | null
): string | null {
  const parts: string[] = [];
  if (sun) {
    const phase = sun.twilightPhase ?? (sun.sunAboveHorizon ? "day" : "night");
    parts.push(phase === "day" ? "Daylight" : phase === "night" ? "Night" : `Twilight (${phase})`);
  } else {
    parts.push("Light state unknown");
  }
  if (weather) {
    const t = weather.temperatureC;
    if (t <= 0) parts.push("freezing air");
    else if (t <= 10) parts.push("cold air");
    else if (t <= 20) parts.push("cool air");
    else if (t <= 28) parts.push("warm air");
    else parts.push("hot air");
    if (weather.humidityPct >= 70) parts.push("humid atmosphere");
    else if (weather.humidityPct <= 30) parts.push("dry atmosphere");
    if (weather.cloudCoverPct >= 80) parts.push("overcast");
    else if (weather.cloudCoverPct >= 50) parts.push("partly cloudy");
    if (weather.precipMm > 0) parts.push("precipitation present");
    if (weather.windSpeedMps >= 10) parts.push("strong wind");
    else if (weather.windSpeedMps >= 5) parts.push("moderate wind");
    else if (weather.windSpeedMps >= 1) parts.push("light wind");
  }
  return parts.length > 0 ? parts.join("; ") : null;
}
