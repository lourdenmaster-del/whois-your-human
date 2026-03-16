/**
 * Tests for POST /api/beauty/dry-run — Studio "Test Paid Report" path.
 * Validates: Studio-shaped payload, dry-run safety (engine called with dryRun: true),
 * response shape (reportId, beautyProfile, checkout), profile persistence (saveBeautyProfileV1).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

const mockSaveBeautyProfileV1 = vi.fn();
vi.mock("@/lib/beauty-profile-store", () => ({
  saveBeautyProfileV1: (...args: unknown[]) => mockSaveBeautyProfileV1(...args),
}));

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/beauty/dry-run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/beauty/dry-run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveBeautyProfileV1.mockResolvedValue(undefined);
    globalThis.fetch = mockFetch;
    mockFetch.mockImplementation((url: string | URL, init?: RequestInit) => {
      const u = typeof url === "string" ? url : url.toString();
      if (u.includes("/api/engine/generate")) {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        if (body.dryRun !== true) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "dryRun must be true" }), { status: 400 })
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: "ok",
              data: {
                reportId: "dry-run-test-report-id",
                full_report: "[DRY RUN] Full report placeholder for " + (body.fullName ?? "Anonymous"),
                emotional_snippet: "[DRY RUN] Light signature at " + (body.birthLocation ?? ""),
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return Promise.reject(new Error("Unexpected fetch URL: " + u));
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns 200 with reportId, beautyProfile, and checkout when payload matches Studio test path", async () => {
    const res = await POST(
      jsonRequest({
        birthData: {
          fullName: "Studio Test User",
          birthDate: "1990-01-15",
          birthTime: "14:30",
          birthLocation: "New York, NY",
          email: "dev@example.com",
        },
        dryRun: true,
      })
    );

    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.status).toBe("ok");
    expect(out.data).toBeDefined();
    expect(out.data.reportId).toBe("dry-run-test-report-id");
    expect(out.data.beautyProfile).toBeDefined();
    expect(out.data.beautyProfile.report).toContain("[DRY RUN]");
    expect(out.data.beautyProfile.emotionalSnippet).toBeDefined();
    expect(out.data.checkout).toBeDefined();
    expect(out.data.checkout.url).toContain("reportId=dry-run-test-report-id");
  });

  it("calls engine/generate with dryRun: true and no image generation path", async () => {
    await POST(
      jsonRequest({
        birthData: {
          fullName: "Test",
          birthDate: "1990-01-15",
          birthTime: "14:30",
          birthLocation: "Boston",
          email: "dev@example.com",
        },
        dryRun: true,
      })
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/engine\/generate$/);
    expect(init?.method).toBe("POST");
    const body = JSON.parse((init?.body as string) ?? "{}");
    expect(body.dryRun).toBe(true);
    expect(body.fullName).toBe("Test");
    expect(body.birthDate).toBe("1990-01-15");
    expect(body.birthTime).toMatch(/14:30/);
    expect(body.birthLocation).toBe("Boston");
    expect(body.email).toBe("dev@example.com");
  });

  it("calls saveBeautyProfileV1 with reportId and profile", async () => {
    await POST(
      jsonRequest({
        birthData: {
          fullName: "Profile Test",
          birthDate: "1985-06-20",
          birthTime: "09:00",
          birthLocation: "Chicago",
          email: "dev@example.com",
        },
        dryRun: true,
      })
    );

    expect(mockSaveBeautyProfileV1).toHaveBeenCalled();
    const [reportId, profile, requestId] = mockSaveBeautyProfileV1.mock.calls[0];
    expect(reportId).toBe("dry-run-test-report-id");
    expect(profile).toBeDefined();
    expect(profile.reportId).toBe(reportId);
    expect(profile.subjectName).toBe("Profile Test");
    expect(profile.emotionalSnippet).toBeDefined();
    expect(profile.fullReport).toBeDefined();
    expect(typeof requestId).toBe("string");
  });

  it("returns 400 when birthData validation fails", async () => {
    const res = await POST(
      jsonRequest({
        birthData: { fullName: "Only" },
        dryRun: true,
      })
    );
    expect(res.status).toBe(400);
  });
});
