/**
 * Derive birth context from birthdate, birthtime, and birthplace.
 * - Timezone: IANA from lat/lon (tz-lookup), local→UTC via luxon
 * - Astronomy: sun_sign, moon_sign, rising_sign via astronomy-engine
 * Only used server-side.
 */

import tzlookup from "tz-lookup";
import { DateTime } from "luxon";

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

function longitudeToZodiacSign(longitudeDeg: number): string {
  const normalized = ((longitudeDeg % 360) + 360) % 360;
  const index = Math.min(Math.floor(normalized / 30), 11);
  return ZODIAC_SIGNS[index] ?? "Aries";
}

export interface DeriveFromBirthDataInput {
  birthdate: string;
  birthtime: string;
  birthplace: string;
}

export interface DeriveFromBirthDataResult {
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  sunLonDeg: number;
  lat: number;
  lon: number;
  timezoneId: string;
  localTimestamp: string;
  utcTimestamp: string;
  placeName?: string;
}

type GeoCacheEntry = { lat: number; lon: number; displayName?: string };
const geoCache = new Map<string, GeoCacheEntry>();

export async function geocodePlace(
  place: string
): Promise<{ lat: number; lon: number; displayName?: string } | null> {
  const key = place.trim().toLowerCase();
  if (!key) return null;
  const cached = geoCache.get(key);
  if (cached) return cached;
  const q = encodeURIComponent(place.trim());
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "LIGS-BeautyEngine/1.0" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
  const first = data?.[0];
  if (!first?.lat || !first?.lon) return null;
  const lat = parseFloat(first.lat);
  const lon = parseFloat(first.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  const entry: GeoCacheEntry = { lat, lon, displayName: first.display_name };
  geoCache.set(key, entry);
  return entry;
}

/**
 * Derive birth context from birth data (server-only).
 * Uses lat/lon to get IANA timezone, converts local birth time to UTC.
 */
export async function deriveFromBirthData(
  input: DeriveFromBirthDataInput
): Promise<DeriveFromBirthDataResult | null> {
  const { birthdate, birthtime, birthplace } = input;
  if (!birthdate?.trim() || !birthtime?.trim() || !birthplace?.trim()) return null;

  const coords = await geocodePlace(birthplace);
  if (!coords) return null;
  const { lat, lon, displayName } = coords;

  // Timezone from lat/lon (tz-lookup, offline)
  let timezoneId = "UTC";
  try {
    timezoneId = tzlookup(lat, lon);
  } catch {
    // fallback to UTC if lookup fails
  }

  // Parse local birth datetime and convert to UTC
  const dStr = birthdate.trim().slice(0, 10);
  const tStr = birthtime.trim().replace(/\s/g, "").slice(0, 8);
  if (!dStr || !/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return null;
  const [hh, mm, ss] = tStr.split(/[:\-]/).map((x) => parseInt(x, 10) || 0);
  const localIso = `${dStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const localDt = DateTime.fromISO(localIso, { zone: timezoneId });
  if (!localDt.isValid) return null;
  const utcDt = localDt.toUTC();
  const utcTimestamp = utcDt.toISO() ?? "";
  const localTimestamp = localDt.toISO() ?? utcTimestamp;
  const date = utcDt.toJSDate();

  const { Body, AstroTime, EclipticLongitude, SiderealTime } = await import("astronomy-engine");
  const time = new AstroTime(date);

  const sunLon = EclipticLongitude(Body.Sun, time);
  const moonLon = EclipticLongitude(Body.Moon, time);

  const GAST_hours = SiderealTime(time);
  const LST_hours = GAST_hours + lon / 15;
  const LST_deg = (LST_hours * 15) % 360;
  const latRad = (lat * Math.PI) / 180;
  const LST_rad = (LST_deg * Math.PI) / 180;
  const obliquityRad = (23.436 * Math.PI) / 180;
  const y = Math.sin(LST_rad);
  const x =
    Math.cos(LST_rad) * Math.cos(obliquityRad) -
    Math.tan(latRad) * Math.sin(obliquityRad);
  let ascLon = (Math.atan2(y, x) * 180) / Math.PI;
  if (ascLon < 0) ascLon += 360;

  return {
    sun_sign: longitudeToZodiacSign(sunLon),
    moon_sign: longitudeToZodiacSign(moonLon),
    rising_sign: longitudeToZodiacSign(ascLon),
    sunLonDeg: sunLon,
    lat,
    lon,
    timezoneId,
    localTimestamp,
    utcTimestamp,
    ...(displayName && { placeName: displayName }),
  };
}
