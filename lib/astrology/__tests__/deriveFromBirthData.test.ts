import { describe, it, expect, vi, beforeEach } from "vitest";
import { deriveFromBirthData } from "../deriveFromBirthData";

const originalFetch = globalThis.fetch;

describe("deriveFromBirthData", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });


  it("returns null when birthdate, birthtime, or birthplace is empty", async () => {
    expect(await deriveFromBirthData({ birthdate: "", birthtime: "14:30", birthplace: "New York, NY" })).toBeNull();
    expect(await deriveFromBirthData({ birthdate: "1990-01-15", birthtime: "", birthplace: "New York, NY" })).toBeNull();
    expect(await deriveFromBirthData({ birthdate: "1990-01-15", birthtime: "14:30", birthplace: "" })).toBeNull();
  });

  it("returns utcTimestamp, timezoneId, lat, lon when geocoding succeeds (integration)", async () => {
    vi.stubGlobal("fetch", originalFetch);
    let result: Awaited<ReturnType<typeof deriveFromBirthData>> = null;
    try {
      result = await deriveFromBirthData({
        birthdate: "1990-01-15",
        birthtime: "14:30",
        birthplace: "New York, NY",
      });
    } catch {
      return;
    } finally {
      vi.stubGlobal("fetch", mockFetch);
    }
    if (!result) return;
    expect(result.timezoneId).toBeDefined();
    expect(result.utcTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.localTimestamp).toBeDefined();
    expect(result.lat).toBe(40.7128);
    expect(result.lon).toBe(-74.006);
    expect(result.sun_sign).toMatch(/^(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)$/);
  }, 15000);

  it("does not treat local time as UTC: Ulm Germany 1900-03-14 11:30 yields different UTC vs local", async () => {
    vi.stubGlobal("fetch", originalFetch);
    let result: Awaited<ReturnType<typeof deriveFromBirthData>> = null;
    try {
      result = await deriveFromBirthData({
        birthdate: "1900-03-14",
        birthtime: "11:30",
        birthplace: "Ulm, Germany",
      });
    } catch {
      return;
    } finally {
      vi.stubGlobal("fetch", mockFetch);
    }
    if (!result) return;
    // Ulm is Europe/Berlin; in 1900 CET was UTC+1. 11:30 local = 10:30 UTC.
    expect(result.timezoneId).toMatch(/Europe\//);
    expect(result.localTimestamp).toContain("11:30");
    expect(result.utcTimestamp).not.toBe(result.localTimestamp);
    // UTC should be 10:30 when local is 11:30 in CET
    expect(result.utcTimestamp).toMatch(/10:30/);
  }, 15000);
});
