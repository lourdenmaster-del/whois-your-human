/**
 * Fetch geomagnetic Kp index for a given UTC moment from GFZ Potsdam.
 * Source: GFZ Kp Index JSON API — historical coverage since 1932 (definitive values).
 * Kp is reported in 3-hour intervals; we return the interval containing the birth time.
 * See: https://kp.gfz.de/en/data — CC BY 4.0.
 */

import type { GeomagneticKpResult } from "./fetchGeomagneticKp";

const GFZ_KP_BASE = "https://kp.gfz.de/app/json";

/**
 * Fetch Kp for the day containing utcTimestamp. GFZ returns 3-hourly intervals (00, 03, 06, 21 UTC).
 * Picks the interval whose start time is <= birth time < next interval start; if birth is exactly on
 * the next day 00:00, we use the last interval of the day.
 */
export async function fetchGeomagneticKpGfz(utcTimestamp: string): Promise<GeomagneticKpResult | null> {
  const date = new Date(utcTimestamp);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const start = `${y}-${m}-${d}T00:00:00Z`;
  const endDate = new Date(date);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endY = endDate.getUTCFullYear();
  const endM = String(endDate.getUTCMonth() + 1).padStart(2, "0");
  const endD = String(endDate.getUTCDate()).padStart(2, "0");
  const end = `${endY}-${endM}-${endD}T00:00:00Z`;
  const url = `${GFZ_KP_BASE}/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&index=Kp&status=def`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      datetime?: string[];
      Kp?: number[];
    };
    const datetimes = data?.datetime;
    const kpValues = data?.Kp;
    if (!Array.isArray(datetimes) || !Array.isArray(kpValues) || datetimes.length === 0) return null;
    const targetMs = date.getTime();
    let intervalStart: string | null = null;
    let kpRaw: number | null = null;
    for (let i = 0; i < datetimes.length; i++) {
      const intervalStartStr = datetimes[i];
      const intervalStartMs = new Date(intervalStartStr).getTime();
      if (Number.isNaN(intervalStartMs)) continue;
      const nextStartMs =
        i + 1 < datetimes.length
          ? new Date(datetimes[i + 1]!).getTime()
          : intervalStartMs + 3 * 60 * 60 * 1000;
      if (targetMs >= intervalStartMs && targetMs < nextStartMs) {
        intervalStart = intervalStartStr;
        const v = kpValues[i];
        kpRaw = typeof v === "number" && v >= 0 && v <= 9 ? v : null;
        break;
      }
    }
    if (intervalStart == null || kpRaw == null) return null;
    const kpIndex = Math.min(9, Math.max(0, Math.round(kpRaw)));
    return { kpIndex, timeTag: intervalStart };
  } catch {
    return null;
  }
}
