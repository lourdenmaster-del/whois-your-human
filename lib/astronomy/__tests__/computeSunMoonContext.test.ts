import { describe, it, expect } from "vitest";
import { computeSunMoonContext } from "../computeSunMoonContext";

const VALID_TWILIGHT_PHASES = ["day", "civil", "nautical", "astronomical", "night"] as const;

describe("computeSunMoonContext", () => {
  it("returns sun and moon with valid twilightPhase", () => {
    // New York, 1990-01-15 14:30 EST (winter afternoon — sun up)
    const result = computeSunMoonContext({
      lat: 40.7128,
      lon: -74.006,
      utcTimestamp: "1990-01-15T19:30:00.000Z",
      timezoneId: "America/New_York",
    });

    expect(VALID_TWILIGHT_PHASES).toContain(result.sun.twilightPhase);
    expect(result.sun.sunAltitudeDeg).toBeDefined();
    expect(typeof result.sun.sunAltitudeDeg).toBe("number");
    expect(typeof result.sun.sunAzimuthDeg).toBe("number");
    expect(typeof result.sun.sunAboveHorizon).toBe("boolean");
  });

  it("returns illuminationFrac within [0, 1]", () => {
    const result = computeSunMoonContext({
      lat: 40.7128,
      lon: -74.006,
      utcTimestamp: "1990-01-15T19:30:00.000Z",
      timezoneId: "America/New_York",
    });

    expect(result.moon.illuminationFrac).toBeGreaterThanOrEqual(0);
    expect(result.moon.illuminationFrac).toBeLessThanOrEqual(1);
    expect(typeof result.moon.phaseName).toBe("string");
    expect(result.moon.phaseName.length).toBeGreaterThan(0);
  });

  it("returns numeric altitudes for sun and moon", () => {
    const result = computeSunMoonContext({
      lat: 51.5074,
      lon: -0.1278,
      utcTimestamp: "2000-06-21T12:00:00.000Z",
      timezoneId: "Europe/London",
    });

    expect(typeof result.sun.sunAltitudeDeg).toBe("number");
    expect(Number.isFinite(result.sun.sunAltitudeDeg)).toBe(true);
    expect(result.sun.sunAltitudeDeg).toBeGreaterThanOrEqual(-90);
    expect(result.sun.sunAltitudeDeg).toBeLessThanOrEqual(90);

    expect(typeof result.moon.moonAltitudeDeg).toBe("number");
    expect(Number.isFinite(result.moon.moonAltitudeDeg)).toBe(true);
    expect(result.moon.moonAltitudeDeg).toBeGreaterThanOrEqual(-90);
    expect(result.moon.moonAltitudeDeg).toBeLessThanOrEqual(90);
  });

  it("returns sunrise/sunset and dayLengthMinutes when available", () => {
    const result = computeSunMoonContext({
      lat: 40.7128,
      lon: -74.006,
      utcTimestamp: "1990-07-15T16:00:00.000Z",
      timezoneId: "America/New_York",
    });

    if (result.sun.sunriseLocal && result.sun.sunsetLocal) {
      expect(typeof result.sun.sunriseLocal).toBe("string");
      expect(typeof result.sun.sunsetLocal).toBe("string");
      if (result.sun.dayLengthMinutes != null) {
        expect(typeof result.sun.dayLengthMinutes).toBe("number");
        expect(result.sun.dayLengthMinutes).toBeGreaterThan(0);
      }
    }
  });
});
