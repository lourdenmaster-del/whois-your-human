/**
 * FIELD CONDITIONS — Operational definitions for paid WHOIS Genesis fields.
 * These definitions are stable; do not change without product approval.
 *
 * ---
 * A) MAGNETIC FIELD INDEX
 * A geomagnetic / space-weather intensity field correlated to the birth date/time,
 * using a real upstream source. When a globally relevant geomagnetic activity metric
 * (e.g. NOAA Planetary K-index) is available for the birth moment, it is resolved
 * and rendered as a concise institutional label (e.g. "Quiet geomagnetic conditions",
 * "K-index 3 (moderate)").
 * ---
 *
 * B) CLIMATE SIGNATURE
 * A concise climate / atmospheric summary derived from real location + time
 * weather/environment data. Normalized release-facing label based on measured
 * conditions (temperature, humidity, season, latitude), not generic prose.
 * ---
 *
 * C) SENSORY FIELD CONDITIONS
 * A concise human-facing environmental conditions summary derived from actual
 * measured local conditions at the event: light/day state (from sun position)
 * plus weather-related factors that would materially shape the field
 * (temperature, humidity, cloud cover, precipitation, wind).
 */

export const FIELD_CONDITIONS_DEFINITIONS = {
  magneticFieldIndex:
    "Geomagnetic/space-weather intensity at birth moment from upstream index (e.g. Kp); concise institutional label.",
  climateSignature:
    "Climate/atmospheric summary from real location+time data; normalized label from measured conditions.",
  sensoryFieldConditions:
    "Human-facing environmental summary: light/day state plus weather (temp, humidity, clouds, precip, wind) at event.",
} as const;
