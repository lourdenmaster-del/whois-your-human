/**
 * Compute birthContext for report generation.
 * Requires birthDate, birthLocation, birthTime. Always computes full sun/moon at exact moment.
 */

import { deriveFromBirthData } from "@/lib/astrology/deriveFromBirthData";
import { computeSunMoonContext } from "@/lib/astronomy/computeSunMoonContext";
import { getSolarSeasonProfile, getSolarSeasonByIndex } from "@/src/ligs/astronomy/solarSeason";

export type BirthContextForReport = Record<string, unknown> & {
  lat?: number;
  lon?: number;
  placeName?: string;
  timezoneId?: string;
  /** address | city | region | country */
  resolutionPrecision?: string;
  /** civic | centroid | point */
  anchorType?: string;
  localTimestamp?: string;
  utcTimestamp?: string;
  sun?: Record<string, unknown>;
  moon?: Record<string, unknown>;
  sunLonDeg?: number;
  solarSeasonProfile?: Record<string, unknown>;
  sun_sign?: string;
  moon_sign?: string;
  rising_sign?: string;
};

/**
 * Compute birth context for report. Requires birthTime; always computes full sun altitude/azimuth, twilight, sunrise/sunset, moon, solar season.
 * Throws on any failure (geocoding, timezone, astronomy); never returns partial context.
 */
export async function computeBirthContextForReport(
  birthDate: string,
  birthLocation: string,
  birthTime: string
): Promise<BirthContextForReport> {
  const dateStr = birthDate?.trim().slice(0, 10);
  const birthTimeTrimmed = (birthTime ?? "").trim();
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !birthLocation?.trim() || !birthTimeTrimmed) {
    throw new Error("Birth context computation failed: invalid input (date, location, or time missing)");
  }

  const derived = await deriveFromBirthData({
    birthdate: birthDate,
    birthtime: birthTimeTrimmed,
    birthplace: birthLocation,
  });
  if (!derived) {
    throw new Error("Birth context computation failed: geocoding or timezone lookup failed");
  }

  const placeName = derived.placeName ?? birthLocation;

  try {
    const { sun, moon } = computeSunMoonContext({
      lat: derived.lat,
      lon: derived.lon,
      utcTimestamp: derived.utcTimestamp,
      timezoneId: derived.timezoneId,
    });
    const solarProfile = getSolarSeasonProfile({
      sunLonDeg: derived.sunLonDeg,
      latitudeDeg: derived.lat,
      date: new Date(derived.utcTimestamp),
      sunAltitudeDeg: sun.sunAltitudeDeg,
      dayLengthMinutes: sun.dayLengthMinutes,
      twilightPhase: sun.twilightPhase,
    });
    return {
      ...derived,
      placeName,
      sun: { ...sun },
      moon: { ...moon },
      solarSeasonProfile: {
        seasonIndex: solarProfile.seasonIndex,
        archetype: solarProfile.archetype,
        lonCenterDeg: solarProfile.lonCenterDeg,
        solarDeclinationDeg: solarProfile.solarDeclinationDeg,
        seasonalPolarity: solarProfile.seasonalPolarity,
        anchorType: getSolarSeasonByIndex(solarProfile.seasonIndex)?.anchorType ?? "none",
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Birth context computation failed: astronomical calculation error (${msg})`);
  }
}
