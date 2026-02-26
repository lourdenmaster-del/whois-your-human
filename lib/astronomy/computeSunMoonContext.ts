/**
 * Compute Sun and Moon horizontal coordinates + twilight + sunrise/sunset.
 * Uses astronomy-engine only; no external APIs. Server-side.
 */

import { DateTime } from "luxon";
import {
  Body,
  Equator,
  Horizon,
  Illumination,
  MoonPhase,
  Observer,
  SearchRiseSet,
  type AstroTime,
} from "astronomy-engine";

export type SunContext = {
  sunAltitudeDeg: number;
  sunAzimuthDeg: number;
  sunAboveHorizon: boolean;
  twilightPhase: "day" | "civil" | "nautical" | "astronomical" | "night";
  sunriseLocal?: string;
  sunsetLocal?: string;
  dayLengthMinutes?: number;
};

export type MoonContext = {
  moonAltitudeDeg: number;
  moonAzimuthDeg: number;
  moonAboveHorizon: boolean;
  illuminationFrac: number;
  phaseName: string;
};

function moonPhaseToName(lonDeg: number): string {
  const n = ((lonDeg % 360) + 360) % 360;
  if (n < 22.5) return "New";
  if (n < 67.5) return "Waxing Crescent";
  if (n < 112.5) return "First Quarter";
  if (n < 157.5) return "Waxing Gibbous";
  if (n < 202.5) return "Full";
  if (n < 247.5) return "Waning Gibbous";
  if (n < 292.5) return "Third Quarter";
  if (n < 337.5) return "Waning Crescent";
  return "New";
}

function altitudeToTwilightPhase(altDeg: number): SunContext["twilightPhase"] {
  if (altDeg >= 0) return "day";
  if (altDeg >= -6) return "civil";
  if (altDeg >= -12) return "nautical";
  if (altDeg >= -18) return "astronomical";
  return "night";
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function astroTimeToLocalIso(t: AstroTime, timezoneId: string): string {
  const date = t.date;
  const dt = DateTime.fromJSDate(date, { zone: "UTC" }).setZone(timezoneId);
  return dt.toISO() ?? "";
}

export function computeSunMoonContext(args: {
  lat: number;
  lon: number;
  utcTimestamp: string;
  timezoneId: string;
}): { sun: SunContext; moon: MoonContext } {
  const { lat, lon, utcTimestamp, timezoneId } = args;
  const observer = new Observer(lat, lon, 0);

  const date = new Date(utcTimestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid utcTimestamp");
  }

  // Sun horizontal position
  const sunEq = Equator(Body.Sun, date, observer, true, true);
  const sunHor = Horizon(date, observer, sunEq.ra, sunEq.dec, "normal");
  const sunAlt = round1(sunHor.altitude);
  const sunAz = round1(sunHor.azimuth);
  const twilightPhase = altitudeToTwilightPhase(sunAlt);

  // Moon horizontal position
  const moonEq = Equator(Body.Moon, date, observer, true, true);
  const moonHor = Horizon(date, observer, moonEq.ra, moonEq.dec, "normal");
  const moonAlt = round1(moonHor.altitude);
  const moonAz = round1(moonHor.azimuth);

  // Moon phase and illumination
  const illum = Illumination(Body.Moon, date);
  const illuminationFrac = round2(Math.min(1, Math.max(0, illum.phase_fraction)));
  const phaseLon = MoonPhase(date);
  const phaseName = moonPhaseToName(phaseLon);

  // Sunrise/sunset for the local calendar day
  const localDt = DateTime.fromISO(utcTimestamp, { zone: "UTC" }).setZone(timezoneId);
  const localDateStr = localDt.toFormat("yyyy-MM-dd");
  const startOfLocalDay = DateTime.fromISO(`${localDateStr}T00:00:00`, { zone: timezoneId });
  const startOfLocalDayUtc = startOfLocalDay.toUTC();
  const searchStart = startOfLocalDayUtc.toJSDate();

  let sunriseLocal: string | undefined;
  let sunsetLocal: string | undefined;
  let dayLengthMinutes: number | undefined;

  const sunriseTime = SearchRiseSet(Body.Sun, observer, 1, searchStart, 1);
  const sunsetTime = SearchRiseSet(Body.Sun, observer, -1, searchStart, 1);

  if (sunriseTime && sunsetTime) {
    sunriseLocal = astroTimeToLocalIso(sunriseTime, timezoneId);
    sunsetLocal = astroTimeToLocalIso(sunsetTime, timezoneId);
    const riseMs = sunriseTime.date.getTime();
    const setMs = sunsetTime.date.getTime();
    dayLengthMinutes = Math.round((setMs - riseMs) / 60000);
  }

  return {
    sun: {
      sunAltitudeDeg: sunAlt,
      sunAzimuthDeg: sunAz,
      sunAboveHorizon: sunAlt >= 0,
      twilightPhase,
      sunriseLocal,
      sunsetLocal,
      dayLengthMinutes,
    },
    moon: {
      moonAltitudeDeg: moonAlt,
      moonAzimuthDeg: moonAz,
      moonAboveHorizon: moonAlt >= 0,
      illuminationFrac,
      phaseName,
    },
  };
}
