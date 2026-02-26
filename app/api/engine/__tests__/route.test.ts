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

vi.mock("@/lib/beauty-profile-store", () => ({
  saveBeautyProfileV1: vi.fn().mockResolvedValue(undefined),
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

function createFetchMock() {
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
        json: () => Promise.resolve(reportResponse),
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
      birthTime: "",
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
});
