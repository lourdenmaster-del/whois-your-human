/**
 * Fetch weather at a specific moment (lat, lon, UTC time) for field-conditions display.
 * Source: Open-Meteo Historical Weather API (archive-api.open-meteo.com).
 * No API key required. Returns null on failure or if date is outside supported range.
 */

export type WeatherAtMoment = {
  temperatureC: number;
  humidityPct: number;
  cloudCoverPct: number;
  precipMm: number;
  weatherCode: number;
  windSpeedMps: number;
};

const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive";

/**
 * Get hourly weather for the calendar day of utcTimestamp at (lat, lon), then pick the hour containing utcTimestamp.
 */
export async function fetchWeatherAtMoment(
  lat: number,
  lon: number,
  utcTimestamp: string
): Promise<WeatherAtMoment | null> {
  const date = new Date(utcTimestamp);
  if (Number.isNaN(date.getTime())) return null;
  const dateStr = date.toISOString().slice(0, 10);
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: dateStr,
    end_date: dateStr,
    hourly: "temperature_2m,relative_humidity_2m,cloud_cover,precipitation,weather_code,wind_speed_10m",
    timezone: "UTC",
  });
  try {
    const res = await fetch(`${ARCHIVE_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      hourly?: {
        time?: string[];
        temperature_2m?: number[];
        relative_humidity_2m?: number[];
        cloud_cover?: number[];
        precipitation?: number[];
        weather_code?: number[];
        wind_speed_10m?: number[];
      };
    };
    const h = data?.hourly;
    if (!h?.time || !Array.isArray(h.time) || h.time.length === 0) return null;

    const targetHour = date.toISOString().slice(0, 13);
    let idx = h.time.findIndex((t) => typeof t === "string" && t.startsWith(targetHour));
    if (idx < 0) idx = 0;

    const temp = h.temperature_2m?.[idx];
    const humidity = h.relative_humidity_2m?.[idx];
    const cloud = h.cloud_cover?.[idx];
    const precip = h.precipitation?.[idx];
    const wcode = h.weather_code?.[idx];
    const wind = h.wind_speed_10m?.[idx];

    return {
      temperatureC: typeof temp === "number" ? temp : 0,
      humidityPct: typeof humidity === "number" ? humidity : 0,
      cloudCoverPct: typeof cloud === "number" ? cloud : 0,
      precipMm: typeof precip === "number" ? precip : 0,
      weatherCode: typeof wcode === "number" ? wcode : 0,
      windSpeedMps: typeof wind === "number" ? wind : 0,
    };
  } catch {
    return null;
  }
}
