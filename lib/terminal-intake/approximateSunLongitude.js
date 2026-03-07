/**
 * Client-safe approximation of Sun ecliptic longitude from birth date.
 * No API calls. Uses day-of-year formula; vernal equinox ~March 20 ≈ day 79.
 * Good enough for 30° solar-season segments.
 */

/** Approximate Sun ecliptic longitude (0–360) from date string. Returns null if unparseable. */
export function approximateSunLongitudeFromDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim().slice(0, 10);
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
  const vernalEquinoxDay = 79;
  const degPerDay = 360 / 365.25;
  let lon = (dayOfYear - vernalEquinoxDay) * degPerDay;
  lon = ((lon % 360) + 360) % 360;
  return lon;
}
