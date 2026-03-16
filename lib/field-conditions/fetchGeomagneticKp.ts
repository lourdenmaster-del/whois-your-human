/**
 * Fetch geomagnetic Kp index for a given UTC moment.
 *
 * AUDIT (source coverage):
 * - SWPC planetary_k_index_1m.json: recent/realtime only (in practice ~1–2 days); most birth dates miss coverage.
 * - GFZ Kp JSON API: definitive 3-hourly Kp since 1932; covers historical birth dates.
 *
 * SOURCE CHAIN: (A) GFZ historical first, (B) SWPC recent fallback. Placeholder only when both fail.
 */

import { fetchGeomagneticKpGfz } from "./fetchGeomagneticKpGfz";

const SWPC_KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";

export type GeomagneticKpResult = {
  kpIndex: number;
  /** ISO time of the 3h block or minute used */
  timeTag: string;
  /** Which source provided the value (for audit/debug) */
  source?: "gfz" | "swpc";
};

/**
 * Resolve Kp for the birth UTC using a source chain: GFZ historical first, then SWPC recent.
 * GFZ: definitive Kp since 1932 (3-hourly). SWPC: real-time/recent only (typically last 1–2 days).
 * Returns null only when both lookups fail.
 */
export async function fetchGeomagneticKp(utcTimestamp: string): Promise<GeomagneticKpResult | null> {
  const gfz = await fetchGeomagneticKpGfz(utcTimestamp);
  if (gfz != null) return { ...gfz, source: "gfz" };
  const swpc = await fetchGeomagneticKpSwpc(utcTimestamp);
  if (swpc != null) return { ...swpc, source: "swpc" };
  return null;
}

/**
 * SWPC planetary K-index 1m — recent/realtime data only (typically last 1–2 days).
 * Used as fallback when GFZ historical query fails or is unavailable.
 */
async function fetchGeomagneticKpSwpc(utcTimestamp: string): Promise<GeomagneticKpResult | null> {
  const date = new Date(utcTimestamp);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const res = await fetch(SWPC_KP_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Array<{ time_tag?: string; kp_index?: number; estimated_kp?: number }>;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const targetTime = date.getTime();
    let best: { time_tag: string; kp_index: number } | null = null;
    let bestDiff = Infinity;
    for (const row of raw) {
      const tag = row.time_tag;
      const kp = row.kp_index ?? row.estimated_kp;
      if (typeof tag !== "string" || (typeof kp !== "number" && kp !== undefined)) continue;
      const rowTime = new Date(tag).getTime();
      if (Number.isNaN(rowTime)) continue;
      const diff = Math.abs(rowTime - targetTime);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = { time_tag: tag, kp_index: typeof kp === "number" ? Math.min(9, Math.max(0, Math.round(kp))) : 0 };
      }
    }
    if (!best) return null;
    return { kpIndex: best.kp_index, timeTag: best.time_tag };
  } catch {
    return null;
  }
}
