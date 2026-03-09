import { describe, it, expect } from "vitest";
import { buildReportGenerationPrompt } from "@/lib/engine/buildReportGenerationPrompt";

describe("buildReportGenerationPrompt", () => {
  it("includes Archetype Voice Block for Stabiliora", () => {
    const birthData = "Full Name: Test User\nBirth Date: 1990-01-15\nBirth Time: 14:30\nBirth Location: New York, NY\nEmail: test@example.com";
    const prompt = buildReportGenerationPrompt(birthData, "Stabiliora");

    expect(prompt).toContain("ARCHETYPE VOICE BLOCK");
    expect(prompt).toContain("Archetype: Stabiliora");
    expect(prompt).toContain("emotional_temperature: low");
    expect(prompt).toContain("rhythm:");
    expect(prompt).toContain("lexicon_bias:");
    expect(prompt).toContain("balance");
    expect(prompt).toContain("metaphor_density: low");
    expect(prompt).toContain("assertiveness: low");
    expect(prompt).toContain("structure_preference: declarative");
    expect(prompt).toContain("notes:");
    expect(prompt).toContain("emotional_snippet");
    expect(prompt).toContain("ORACLE");
  });

  it("includes Birth Context block when birthContext is provided (minimal shape)", () => {
    const birthData = "Full Name: Test User\nBirth Date: 1990-01-15\nBirth Time: 14:30\nBirth Location: New York\nEmail: test@example.com";
    const birthContext = {
      placeName: "New York, NY, USA",
      lat: 40.7128,
      lon: -74.006,
      timezoneId: "America/New_York",
      localTimestamp: "1990-01-15T14:30:00.000-05:00",
      utcTimestamp: "1990-01-15T19:30:00.000Z",
      sun_sign: "Capricorn",
      moon_sign: "Scorpio",
      rising_sign: "Libra",
    };
    const prompt = buildReportGenerationPrompt(birthData, "Stabiliora", birthContext);

    expect(prompt).toContain("GROUND TRUTH");
    expect(prompt).toContain("BOUNDARY CONDITIONS will be inserted separately");
    expect(prompt).toContain("Location: New York, NY, USA");
    expect(prompt).toContain("40.7128°N");
    expect(prompt).toContain("74.0060°W");
    expect(prompt).toContain("Timezone: America/New_York");
    expect(prompt).toContain("Computed ecliptic markers");
    expect(prompt).toContain("Capricorn");
    expect(prompt).toContain("Scorpio");
    expect(prompt).toContain("Libra");
  });

  it("omits Birth Context block (location/coordinates) when birthContext is null/undefined", () => {
    const birthData = "Full Name: Test User\nBirth Date: 1990-01-15\nBirth Location: New York\nEmail: test@example.com";
    const promptWithout = buildReportGenerationPrompt(birthData, "Stabiliora");
    expect(promptWithout).not.toContain("BOUNDARY CONDITIONS will be inserted separately");

    const promptWithNull = buildReportGenerationPrompt(birthData, "Stabiliora", null);
    expect(promptWithNull).not.toContain("BOUNDARY CONDITIONS will be inserted separately");
  });

  it("includes On this date block only when onThisDay exists", () => {
    const birthData = "Full Name: Test User\nBirth Date: 1990-03-15\nBirth Location: New York\nEmail: test@example.com";
    const birthContextWithOnThisDay = {
      placeName: "New York",
      lat: 40.71,
      lon: -74,
      timezoneId: "America/New_York",
      localTimestamp: "1990-03-15T10:00:00-05:00",
      utcTimestamp: "1990-03-15T15:00:00Z",
      sun_sign: "Pisces",
      moon_sign: "Leo",
      rising_sign: "Sagittarius",
      onThisDay: {
        month: 3,
        day: 15,
        source: "wikimedia_onthisday" as const,
        items: [
          { year: 1956, text: "My Fair Lady debuted on Broadway." },
          { year: 1960, text: "Atlanta sit-ins began." },
        ],
      },
    };
    const promptWith = buildReportGenerationPrompt(birthData, "Stabiliora", birthContextWithOnThisDay);
    expect(promptWith).toContain("On this date (world history context):");
    expect(promptWith).toContain("1956 — My Fair Lady debuted on Broadway.");
    expect(promptWith).toContain("1960 — Atlanta sit-ins began.");

    const birthContextWithoutOnThisDay = {
      placeName: "New York",
      lat: 40.71,
      lon: -74,
      sun_sign: "Pisces",
      moon_sign: "Leo",
      rising_sign: "Sagittarius",
    };
    const promptWithout = buildReportGenerationPrompt(birthData, "Stabiliora", birthContextWithoutOnThisDay);
    expect(promptWithout).not.toContain("On this date (world history context):");
  });

  it("includes Sun/Moon sections when birthContext has sun and moon", () => {
    const birthData = "Full Name: Test User\nBirth Date: 1990-03-15\nBirth Location: New York\nEmail: test@example.com";
    const birthContextWithSunMoon = {
      placeName: "New York",
      lat: 40.71,
      lon: -74,
      timezoneId: "America/New_York",
      localTimestamp: "1990-03-15T10:00:00-05:00",
      utcTimestamp: "1990-03-15T15:00:00Z",
      sun_sign: "Pisces",
      moon_sign: "Leo",
      rising_sign: "Sagittarius",
      sun: {
        sunAltitudeDeg: 42.3,
        sunAzimuthDeg: 158.1,
        sunAboveHorizon: true,
        twilightPhase: "day" as const,
        sunriseLocal: "1990-03-15T06:15:00.000-05:00",
        sunsetLocal: "1990-03-15T18:10:00.000-05:00",
        dayLengthMinutes: 715,
      },
      moon: {
        moonAltitudeDeg: -12.5,
        moonAzimuthDeg: 280,
        moonAboveHorizon: false,
        illuminationFrac: 0.67,
        phaseName: "Waxing Gibbous",
      },
    };
    const prompt = buildReportGenerationPrompt(birthData, "Stabiliora", birthContextWithSunMoon);

    expect(prompt).toContain("- Sun:");
    expect(prompt).toContain("alt 42.3°");
    expect(prompt).toContain("above horizon");
    expect(prompt).toContain("twilight: day");
    expect(prompt).toContain("Sunrise (local):");
    expect(prompt).toContain("Sunset (local):");
    expect(prompt).toContain("Day length: 715 min");

    expect(prompt).toContain("- Moon:");
    expect(prompt).toContain("Waxing Gibbous");
    expect(prompt).toContain("67% illuminated");
    expect(prompt).toContain("below horizon");
  });

  it("includes Solar Season + Cosmic Analogue block (always appended)", () => {
    const birthData = "Full Name: Test User\nBirth Date: 1990-01-15\nBirth Location: New York\nEmail: test@example.com";
    const prompt = buildReportGenerationPrompt(birthData, "Stabiliora");
    expect(prompt).toContain("SOLAR SEASON + COSMIC ANALOGUE");
    // Without birthContext/sunLonDeg: solar unknown, never invented
    expect(prompt).toContain("Solar season: unknown");
    expect(prompt).toContain("Cosmic analogue:");
    expect(prompt).toContain("phenomenon:");
    expect(prompt).toContain("light-behavior keywords:");
    expect(prompt).toContain("FIELD SOLUTION will be inserted separately");
  });

  it("includes full solar block when birthContext has sunLonDeg", () => {
    const birthData = "Full Name: Test User\nBirth Date: 1990-03-15\nBirth Location: New York\nEmail: test@example.com";
    const birthContext = {
      sunLonDeg: 354,
      lat: 40.71,
      utcTimestamp: "1990-03-15T15:00:00Z",
    };
    const prompt = buildReportGenerationPrompt(birthData, "Stabiliora", birthContext);
    expect(prompt).toContain("seasonIndex:");
    expect(prompt).toContain("archetype:");
    expect(prompt).toContain("lonCenterDeg:");
    expect(prompt).toContain("declinationDeg:");
    expect(prompt).toContain("polarity:");
    expect(prompt).not.toContain("Solar season: unknown");
  });

  it("includes sun, moon, and onThisDay when birthContext has all three", () => {
    const birthData = "Full Name: Test User\nBirth Date: 1990-03-15\nBirth Location: New York\nEmail: test@example.com";
    const birthContext = {
      placeName: "New York",
      lat: 40.71,
      lon: -74,
      timezoneId: "America/New_York",
      localTimestamp: "1990-03-15T10:00:00-05:00",
      utcTimestamp: "1990-03-15T15:00:00Z",
      sun_sign: "Pisces",
      moon_sign: "Leo",
      rising_sign: "Sagittarius",
      sun: {
        sunAltitudeDeg: 42.3,
        sunAzimuthDeg: 158.1,
        sunAboveHorizon: true,
        twilightPhase: "day" as const,
        sunriseLocal: "1990-03-15T06:15:00.000-05:00",
        sunsetLocal: "1990-03-15T18:10:00.000-05:00",
        dayLengthMinutes: 715,
      },
      moon: {
        moonAltitudeDeg: -12.5,
        moonAzimuthDeg: 280,
        moonAboveHorizon: false,
        illuminationFrac: 0.67,
        phaseName: "Waxing Gibbous",
      },
      onThisDay: {
        month: 3,
        day: 15,
        source: "wikimedia_onthisday" as const,
        items: [{ year: 1956, text: "My Fair Lady debuted." }],
      },
    };
    const prompt = buildReportGenerationPrompt(birthData, "Stabiliora", birthContext);

    expect(prompt).toContain("- Sun:");
    expect(prompt).toContain("alt 42.3°");
    expect(prompt).toContain("- Moon:");
    expect(prompt).toContain("Waxing Gibbous");
    expect(prompt).toContain("On this date (world history context):");
    expect(prompt).toContain("1956 — My Fair Lady debuted.");
  });
});
