/**
 * Tests for POST /api/engine/generate — report generation and persistence fallback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

const mockSaveReportAndConfirm = vi.fn();
vi.mock("@/lib/report-store", () => ({
  saveReportAndConfirm: (...args: unknown[]) => mockSaveReportAndConfirm(...args),
}));

vi.mock("@/lib/engine/computeBirthContextForReport", () => ({
  computeBirthContextForReport: vi.fn().mockResolvedValue({
    lat: 40.7128,
    lon: -74.006,
    placeName: "New York",
    timezoneId: "America/New_York",
    localTimestamp: "1990-01-15T14:30:00.000-05:00",
    utcTimestamp: "1990-01-15T19:30:00.000Z",
    sun: { sunAltitudeDeg: 25, sunAzimuthDeg: 210, twilightPhase: "day", sunriseLocal: "07:15", sunsetLocal: "17:00", dayLengthMinutes: 585 },
    moon: { phaseName: "Waning Gibbous", illuminationFrac: 0.8, moonAltitudeDeg: 45, moonAzimuthDeg: 120 },
    sunLonDeg: 295,
    solarSeasonProfile: { seasonIndex: 11, archetype: "Fluxionis", lonCenterDeg: 345, solarDeclinationDeg: -20, seasonalPolarity: "waning", anchorType: "none" },
  }),
}));

const mockOpenAICreate = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  })),
}));

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/engine/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Minimal report structure required by the route: section "1. INITIATION" so subject-name injection can succeed. */
const MINIMAL_VALID_REPORT_PREFIX = `1. INITIATION

`;

const env = process.env as Record<string, string | undefined>;

describe("POST /api/engine/generate", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalDebug = process.env.DEBUG_PERSISTENCE;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveReportAndConfirm.mockResolvedValue({ ok: true });
    mockOpenAICreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                full_report:
                  MINIMAL_VALID_REPORT_PREFIX +
                  "Generated report content with enough text to pass validation and be useful for testing the fallback behavior when storage fails.",
                emotional_snippet: "A structural pattern at initialization.",
              }),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                image_prompts: ["prompt1", "prompt2"],
              }),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                coherence_score: 0.8,
                primary_wavelength: "580nm",
                secondary_wavelength: "450nm",
                symmetry_profile: { lateral: 0.7, vertical: 0.7, depth: 0.7 },
                beauty_baseline: {
                  color_family: "warm",
                  texture_bias: "smooth",
                  shape_bias: "balanced",
                  motion_bias: "steady",
                },
                three_voice: {
                  raw_signal: "r",
                  custodian: "c",
                  oracle: "o",
                },
              }),
            },
          },
        ],
      });
  });

  afterEach(() => {
    env.NODE_ENV = originalEnv;
    if (originalDebug !== undefined) process.env.DEBUG_PERSISTENCE = originalDebug;
    else delete process.env.DEBUG_PERSISTENCE;
  });

  it("returns 200 with full_report and warning when storage fails and DEBUG_PERSISTENCE=1", async () => {
    env.NODE_ENV = "development";
    process.env.DEBUG_PERSISTENCE = "1";
    process.env.OPENAI_API_KEY = "sk-test";
    mockSaveReportAndConfirm.mockResolvedValueOnce({
      ok: false,
      error: "Blob write failed",
    });

    const res = await POST(
      jsonRequest({
        fullName: "Test User",
        birthDate: "1990-01-15",
        birthTime: "14:30",
        birthLocation: "New York",
        email: "test@example.com",
        idempotencyKey: "a1b2c3d4-e5f6-4789-a012-345678901001",
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.data.reportId).toMatch(/^UNSAVED:/);
    expect(data.data.full_report).toContain("Generated report content");
    expect(data.data.emotional_snippet).toBe("A structural pattern at initialization.");
    expect(data.data.warning).toBe("REPORT_NOT_SAVED_BLOB_WRITE_FAILED");
  });

  it("returns 200 with fallback when storage fails in development (no DEBUG_PERSISTENCE)", async () => {
    env.NODE_ENV = "development";
    delete process.env.DEBUG_PERSISTENCE;
    process.env.OPENAI_API_KEY = "sk-test";
    mockSaveReportAndConfirm.mockResolvedValueOnce({
      ok: false,
      error: "Blob write failed",
    });

    const res = await POST(
      jsonRequest({
        fullName: "Test User",
        birthDate: "1990-01-15",
        birthTime: "14:30",
        birthLocation: "New York",
        email: "test@example.com",
        idempotencyKey: "a1b2c3d4-e5f6-4789-a012-345678901002",
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.warning).toBe("REPORT_NOT_SAVED_BLOB_WRITE_FAILED");
  });

  it("runs constraint gate repair when full_report contains forbidden term (chakra)", async () => {
    env.NODE_ENV = "development";
    process.env.OPENAI_API_KEY = "sk-test";
    mockSaveReportAndConfirm.mockResolvedValue({ ok: true });
    mockOpenAICreate.mockReset();

    // 1. Report generation returns text with "chakra" but valid section structure for injection
    mockOpenAICreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                full_report:
                  MINIMAL_VALID_REPORT_PREFIX +
                  "The chakra alignment at birth creates spectral coherence. RAW SIGNAL: Light vectors. CUSTODIAN: Biological reception. ORACLE: Identity emerges.",
                emotional_snippet: "A structural pattern at initialization.",
              }),
            },
          },
        ],
      })
      // 2. Repair pass returns clean report (same structure so downstream steps succeed)
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                full_report:
                  MINIMAL_VALID_REPORT_PREFIX +
                  "Spectral coherence at birth. RAW SIGNAL: Light vectors. CUSTODIAN: Biological reception. ORACLE: Identity emerges.",
              }),
            },
          },
        ],
      })
      // 3. Image prompts
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ image_prompts: ["prompt1", "prompt2"] }),
            },
          },
        ],
      })
      // 4. Vector zero
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                coherence_score: 0.8,
                primary_wavelength: "580nm",
                secondary_wavelength: "450nm",
                symmetry_profile: { lateral: 0.7, vertical: 0.7, depth: 0.7 },
                beauty_baseline: {
                  color_family: "warm",
                  texture_bias: "smooth",
                  shape_bias: "balanced",
                  motion_bias: "steady",
                },
                three_voice: { raw_signal: "r", custodian: "c", oracle: "o" },
              }),
            },
          },
        ],
      });

    const res = await POST(
      jsonRequest({
        fullName: "Test User",
        birthDate: "1990-01-15",
        birthTime: "14:30",
        birthLocation: "New York",
        email: "test@example.com",
        idempotencyKey: "a1b2c3d4-e5f6-4789-a012-345678901003",
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.full_report).not.toContain("chakra");
    expect(data.data.full_report).toContain("Spectral coherence");
    expect(data.data.meta?.forbiddenHitsDetected).toContain("chakra");
    expect(mockOpenAICreate).toHaveBeenCalledTimes(4);
  });

  it("returns 503 when storage fails in production without DEBUG_PERSISTENCE", async () => {
    env.NODE_ENV = "production";
    delete process.env.DEBUG_PERSISTENCE;
    process.env.OPENAI_API_KEY = "sk-test";
    mockSaveReportAndConfirm.mockResolvedValueOnce({
      ok: false,
      error: "Blob write failed",
    });

    const res = await POST(
      jsonRequest({
        fullName: "Test User",
        birthDate: "1990-01-15",
        birthTime: "14:30",
        birthLocation: "New York",
        email: "test@example.com",
        idempotencyKey: "a1b2c3d4-e5f6-4789-a012-345678901004",
      })
    );

    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.status).toBeUndefined();
    expect(data.error).toBeDefined();
    expect(data.data).toBeUndefined();
  });

  it("returns 500 when birth context computation fails in production", async () => {
    const { computeBirthContextForReport } = await import("@/lib/engine/computeBirthContextForReport");
    (computeBirthContextForReport as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("geocoding failed"));

    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const res = await POST(
      jsonRequest({
        fullName: "Test",
        birthDate: "1990-01-15",
        birthTime: "14:30",
        birthLocation: "InvalidPlaceXYZ123",
        email: "test@example.com",
        idempotencyKey: "a1b2c3d4-e5f6-4789-a012-345678901099",
      })
    );

    process.env.NODE_ENV = originalNodeEnv;
    expect(res.status).toBe(500);
  });

  it("uses LigsStudio fallback birth context when compute fails in development", async () => {
    const { computeBirthContextForReport } = await import("@/lib/engine/computeBirthContextForReport");
    (computeBirthContextForReport as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("geocoding failed"));

    const res = await POST(
      jsonRequest({
        fullName: "Test",
        birthDate: "1990-01-15",
        birthTime: "14:30",
        birthLocation: "InvalidPlaceXYZ123",
        email: "test@example.com",
        idempotencyKey: "a1b2c3d4-e5f6-4789-a012-345678901098",
      })
    );
    // In dev/test, fallback is used; request proceeds (may fail later for other reasons, but not 500 from compute)
    expect(res.status).not.toBe(500);
  });

  it("returns 400 when birthTime is missing or invalid", async () => {
    const resMissing = await POST(
      jsonRequest({
        fullName: "Test",
        birthDate: "1990-01-15",
        birthLocation: "New York",
        email: "test@example.com",
      })
    );
    expect(resMissing.status).toBe(400);

    const resEmpty = await POST(
      jsonRequest({
        fullName: "Test",
        birthDate: "1990-01-15",
        birthTime: "",
        birthLocation: "New York",
        email: "test@example.com",
      })
    );
    expect(resEmpty.status).toBe(400);

    const resInvalid = await POST(
      jsonRequest({
        fullName: "Test",
        birthDate: "1990-01-15",
        birthTime: "99:99",
        birthLocation: "New York",
        email: "test@example.com",
      })
    );
    expect(resInvalid.status).toBe(400);
  });
});
