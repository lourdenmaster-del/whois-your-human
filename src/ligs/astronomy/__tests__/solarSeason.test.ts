import { describe, it, expect } from "vitest";
import {
  SOLAR_SEASONS,
  getSolarSeasonProfile,
  getSolarSeasonByIndex,
} from "../solarSeason";

describe("solarSeason", () => {
  it("SOLAR_SEASONS has 12 entries with correct structure", () => {
    expect(SOLAR_SEASONS).toHaveLength(12);
    for (const s of SOLAR_SEASONS) {
      expect(s).toHaveProperty("index");
      expect(s).toHaveProperty("archetype");
      expect(s).toHaveProperty("lonStartDeg");
      expect(s).toHaveProperty("lonEndDeg");
      expect(s).toHaveProperty("lonCenterDeg");
      expect(s).toHaveProperty("anchorType");
      expect(s.lonCenterDeg).toBe(s.lonStartDeg + 15);
      expect(["equinox", "solstice", "crossquarter", "none"]).toContain(s.anchorType);
    }
  });

  it("getSolarSeasonProfile returns correct seasonIndex from sunLonDeg", () => {
    expect(getSolarSeasonProfile({ sunLonDeg: 0, latitudeDeg: 40, date: new Date() }).seasonIndex).toBe(0);
    expect(getSolarSeasonProfile({ sunLonDeg: 15, latitudeDeg: 40, date: new Date() }).seasonIndex).toBe(0);
    expect(getSolarSeasonProfile({ sunLonDeg: 30, latitudeDeg: 40, date: new Date() }).seasonIndex).toBe(1);
    expect(getSolarSeasonProfile({ sunLonDeg: 120, latitudeDeg: 40, date: new Date() }).seasonIndex).toBe(4);
    expect(getSolarSeasonProfile({ sunLonDeg: 350, latitudeDeg: 40, date: new Date() }).seasonIndex).toBe(11);
  });

  it("getSolarSeasonProfile computes seasonalPolarity correctly", () => {
    const wax = getSolarSeasonProfile({ sunLonDeg: 90, latitudeDeg: 40, date: new Date() });
    expect(wax.seasonalPolarity).toBe("waxing");
    const wan = getSolarSeasonProfile({ sunLonDeg: 270, latitudeDeg: 40, date: new Date() });
    expect(wan.seasonalPolarity).toBe("waning");
  });

  it("getSolarSeasonProfile uses twilightPhase when provided", () => {
    const p = getSolarSeasonProfile({
      sunLonDeg: 0,
      latitudeDeg: 40,
      date: new Date(),
      twilightPhase: "nautical",
    });
    expect(p.twilightClass).toBe("nautical");
  });

  it("getSolarSeasonProfile computes dayLengthNorm01 when dayLengthMinutes provided", () => {
    const p = getSolarSeasonProfile({
      sunLonDeg: 0,
      latitudeDeg: 40,
      date: new Date(),
      dayLengthMinutes: 720,
    });
    expect(p.dayLengthNorm01).toBeGreaterThanOrEqual(0);
    expect(p.dayLengthNorm01).toBeLessThanOrEqual(1);
  });

  it("getSolarSeasonByIndex returns entry or undefined", () => {
    expect(getSolarSeasonByIndex(0)?.archetype).toBe("Ignispectrum");
    expect(getSolarSeasonByIndex(11)?.archetype).toBe("Fluxionis");
    expect(getSolarSeasonByIndex(12)).toBeUndefined();
  });
});
