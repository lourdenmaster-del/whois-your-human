/**
 * Tests for POST /api/engine — E.V.E. pipeline and birthContext forwarding.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  vector_zero: {
                    three_voice: { raw_signal: "x", custodian: "y", oracle: "z" },
                    beauty_baseline: {
                      color_family: "warm",
                      texture_bias: "smooth",
                      shape_bias: "balanced",
                      motion_bias: "steady",
                    },
                  },
                  light_signature: { raw_signal: "a", custodian: "b", oracle: "c" },
                  archetype: { raw_signal: "d", custodian: "e", oracle: "f" },
                  deviations: { raw_signal: "g", custodian: "h", oracle: "i" },
                  corrective_vector: { raw_signal: "j", custodian: "k", oracle: "l" },
                  imagery_prompts: {
                    vector_zero_beauty_field: "v0",
                    light_signature_aesthetic_field: "ls",
                    final_beauty_field: "fb",
                  },
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

const mockSaveBeautyProfileV1 = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/beauty-profile-store", () => ({
  saveBeautyProfileV1: (reportId: string, payload: unknown) => mockSaveBeautyProfileV1(reportId, payload),
}));

const mockBirthContext = {
  timezoneId: "America/New_York",
  utcTimestamp: "1990-01-15T19:30:00.000Z",
  localTimestamp: "1990-01-15T14:30:00.000-05:00",
  lat: 40.7128,
  lon: -74.006,
  sun_sign: "Capricorn",
  moon_sign: "Scorpio",
  rising_sign: "Libra",
};

const engineResponse = {
  status: "ok",
  data: {
    reportId: "r-123",
    full_report: "Initiation: forces.\nSpectral Origin, Temporal Encoding.",
    emotional_snippet: "Snippet.",
    image_prompts: ["p1", "p2"],
    vector_zero: {
      coherence_score: 0.85,
      primary_wavelength: "580–620 nm",
      secondary_wavelength: "450–480 nm",
      symmetry_profile: { lateral: 0.7, vertical: 0.75, depth: 0.7 },
      beauty_baseline: {
        color_family: "warm",
        texture_bias: "smooth",
        shape_bias: "balanced",
        motion_bias: "steady",
      },
      three_voice: { raw_signal: "x", custodian: "y", oracle: "z" },
    },
  },
};

/** Report with archetype that can conflict with solar-derived (for identity invariance tests). */
const reportWithRadiantis = {
  status: "ok",
  data: {
    reportId: "r-123",
    full_report: "Initiation: forces.\nSpectral Origin.\nDominant: Radiantis.\nTemporal Encoding.",
    emotional_snippet: engineResponse.data.emotional_snippet,
    vector_zero: engineResponse.data.vector_zero,
  },
};

const reportResponse = {
  status: "ok",
  data: {
    reportId: "r-123",
    full_report: engineResponse.data.full_report,
    emotional_snippet: engineResponse.data.emotional_snippet,
    vector_zero: engineResponse.data.vector_zero,
  },
};

function jsonRequest(body: unknown, url = "http://localhost:3000/api/engine") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createFetchMock(reportOverride?: typeof reportResponse) {
  const report = reportOverride ?? reportResponse;
  return vi.fn().mockImplementation((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    if (url.includes("/api/engine/generate")) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(engineResponse)),
      } as Response);
    }
    if (url.includes("/api/report/")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(report),
      } as Response);
    }
    return Promise.reject(new Error(`Unmocked fetch: ${url}`));
  });
}

describe("POST /api/engine", () => {
  let fetchMock: ReturnType<typeof createFetchMock>;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    process.env.VERCEL_URL = undefined;
    fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("forwards birthContext to engine/generate when present in request body", async () => {
    const req = jsonRequest({
      fullName: "Test User",
      birthDate: "1990-01-15",
      birthTime: "14:30",
      birthLocation: "New York, NY",
      email: "test@example.com",
      birthContext: mockBirthContext,
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const engineGenerateCalls = fetchMock.mock.calls.filter(
      (c) => String(c[0]).includes("/api/engine/generate")
    );
    expect(engineGenerateCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse((engineGenerateCalls[0][1] as RequestInit).body as string);
    expect(body.birthContext).toBeDefined();
    expect(body.birthContext.timezoneId).toBe("America/New_York");
    expect(body.fullName).toBe("Test User");
  });

  it("forwards astrology as birthContext when astrology (not birthContext) is present (backward compat)", async () => {
    const astrology = { sun_sign: "Aries", moon_sign: "Leo", rising_sign: "Sagittarius" };
    const req = jsonRequest({
      fullName: "Legacy User",
      birthDate: "2000-04-15",
      birthTime: "08:00",
      birthLocation: "Tokyo, Japan",
      email: "legacy@example.com",
      astrology,
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const engineGenerateCalls = fetchMock.mock.calls.filter(
      (c) => String(c[0]).includes("/api/engine/generate")
    );
    const body = JSON.parse((engineGenerateCalls[0][1] as RequestInit).body as string);
    expect(body.birthContext).toEqual(astrology);
  });

  it("does not include birthContext when absent from request body", async () => {
    const req = jsonRequest({
      fullName: "Other User",
      birthDate: "1985-06-20",
      birthTime: "14:30",
      birthLocation: "London, UK",
      email: "other@example.com",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const engineGenerateCalls = fetchMock.mock.calls.filter(
      (c) => String(c[0]).includes("/api/engine/generate")
    );
    expect(engineGenerateCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse((engineGenerateCalls[0][1] as RequestInit).body as string);
    expect(body).not.toHaveProperty("birthContext");
  });

  it("identity invariance: when sunLonDeg exists, dominantArchetype === solarSeasonProfile.archetype", async () => {
    /** sunLonDeg 295 → Structoris (segment 9). Report says "Dominant: Radiantis" — solar must win. */
    const birthContextWithSunLon = { ...mockBirthContext, sunLonDeg: 295 };
    fetchMock = createFetchMock(reportWithRadiantis);
    vi.stubGlobal("fetch", fetchMock);
    mockSaveBeautyProfileV1.mockClear();

    const req = jsonRequest({
      fullName: "Identity Test",
      birthDate: "1990-01-15",
      birthTime: "14:30",
      birthLocation: "New York, NY",
      email: "id@example.com",
      birthContext: birthContextWithSunLon,
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSaveBeautyProfileV1).toHaveBeenCalled();
    const [, payload] = mockSaveBeautyProfileV1.mock.calls[0] as [string, { dominantArchetype?: string; solarSeasonProfile?: { archetype?: string }; fullReport?: string }];
    expect(payload.dominantArchetype).toBe("Structoris");
    expect(payload.solarSeasonProfile?.archetype).toBe("Structoris");
    expect(payload.dominantArchetype).toBe(payload.solarSeasonProfile?.archetype);
    /** E.V.E. alignment: fullReport (buildCondensedFullReport) uses canonical archetype; Key Moves = Structoris phrase bank. */
    expect(payload.fullReport).toContain("draw or list the current structure");
  });

  it("E.V.E. alignment: fullReport Key Moves use canonical archetype (Structoris) when report says Radiantis", async () => {
    /** Report says "Dominant: Radiantis"; solar 295° → Structoris. buildCondensedFullReport uses canonicalArchetype → Structoris phrase bank. */
    const birthContextWithSunLon = { ...mockBirthContext, sunLonDeg: 295 };
    fetchMock = createFetchMock(reportWithRadiantis);
    vi.stubGlobal("fetch", fetchMock);
    mockSaveBeautyProfileV1.mockClear();

    const req = jsonRequest({
      fullName: "EVE Alignment Test",
      birthDate: "1990-01-15",
      birthTime: "14:30",
      birthLocation: "New York, NY",
      email: "eve@example.com",
      birthContext: birthContextWithSunLon,
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const [, payload] = mockSaveBeautyProfileV1.mock.calls[0] as [string, { fullReport?: string }];
    expect(payload.fullReport).toContain("draw or list the current structure");
  });

  it("identity fallback: when sunLonDeg missing, dominantArchetype from extractArchetypeFromReport", async () => {
    /** No sunLonDeg in birthContext — fallback to report parse. */
    const birthContextNoSunLon = { timezoneId: "America/New_York", lat: 40.7, lon: -74 };
    fetchMock = createFetchMock(reportWithRadiantis);
    vi.stubGlobal("fetch", fetchMock);
    mockSaveBeautyProfileV1.mockClear();

    const req = jsonRequest({
      fullName: "Fallback Test",
      birthDate: "1990-01-15",
      birthTime: "14:30",
      birthLocation: "New York, NY",
      email: "fb@example.com",
      birthContext: birthContextNoSunLon,
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSaveBeautyProfileV1).toHaveBeenCalled();
    const [, payload] = mockSaveBeautyProfileV1.mock.calls[0] as [string, { dominantArchetype?: string }];
    expect(payload.dominantArchetype).toBe("Radiantis");
  });
});
