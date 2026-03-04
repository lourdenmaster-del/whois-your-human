/**
 * Tests for POST /api/dev/verify-saved — dev-only Blob persistence verification.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

const mockGetReport = vi.fn();
const mockGetStorageInfo = vi.fn();
vi.mock("@/lib/report-store", () => ({
  getReport: (...args: unknown[]) => mockGetReport(...args),
  getStorageInfo: (...args: unknown[]) => mockGetStorageInfo(...args),
  reportBlobPathname: (id: string) => `ligs-reports/${id}.json`,
}));

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/dev/verify-saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const env = process.env as Record<string, string | undefined>;

describe("POST /api/dev/verify-saved", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    env.NODE_ENV = "development";
    mockGetStorageInfo.mockReturnValue({ storage: "blob" });
  });

  afterEach(() => {
    env.NODE_ENV = originalEnv;
  });

  it("returns 403 when NODE_ENV is production", async () => {
    env.NODE_ENV = "production";

    const res = await POST(jsonRequest({ reportId: "abc-123" }));

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.reason).toContain("dev-only");
    expect(mockGetReport).not.toHaveBeenCalled();
  });

  it("returns ok:false with reason unsaved when reportId starts with UNSAVED:", async () => {
    const res = await POST(jsonRequest({ reportId: "UNSAVED:abc-123" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.reason).toBe("unsaved");
    expect(data.reportId).toBe("UNSAVED:abc-123");
    expect(mockGetReport).not.toHaveBeenCalled();
  });

  it("returns ok:true when report is found in storage", async () => {
    mockGetReport.mockResolvedValue({
      full_report: "Full report content here.",
      emotional_snippet: "A snippet.",
      image_prompts: [],
    });

    const res = await POST(jsonRequest({ reportId: "valid-id-123" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.reportFound).toBe(true);
    expect(data.reportId).toBe("valid-id-123");
    expect(data.full_report_length).toBeGreaterThan(0);
    expect(data.keys).toContain("ligs-reports/valid-id-123.json");
    expect(mockGetReport).toHaveBeenCalledWith("valid-id-123");
  });

  it("returns ok:false with reason not_found when report does not exist", async () => {
    mockGetReport.mockResolvedValue(undefined);

    const res = await POST(jsonRequest({ reportId: "nonexistent-id" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.reason).toBe("not_found");
  });
});
