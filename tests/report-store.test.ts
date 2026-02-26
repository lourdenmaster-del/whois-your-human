/**
 * Unit tests for report-store: reportBlobPathname and saveReportAndConfirm.
 * saveReportAndConfirm integration test runs in-memory when BLOB_READ_WRITE_TOKEN is unset.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { put } from "@vercel/blob";
import {
  reportBlobPathname,
  BLOB_PREFIX,
  saveReportAndConfirm,
} from "../lib/report-store";

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  head: vi.fn(),
  list: vi.fn().mockResolvedValue({ blobs: [] }),
}));

describe("reportBlobPathname", () => {
  it("formats pathname as BLOB_PREFIX + reportId + .json", () => {
    expect(reportBlobPathname("abc-123")).toBe("ligs-reports/abc-123.json");
    expect(reportBlobPathname("xyz")).toBe("ligs-reports/xyz.json");
  });

  it("uses BLOB_PREFIX constant", () => {
    const reportId = "test-uuid-456";
    const path = reportBlobPathname(reportId);
    expect(path).toMatch(new RegExp(`^${BLOB_PREFIX.replace("/", "\\/")}`));
    expect(path).toBe(`${BLOB_PREFIX}${reportId}.json`);
  });

  it("handles UUID-style reportIds", () => {
    const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    expect(reportBlobPathname(uuid)).toBe(`${BLOB_PREFIX}${uuid}.json`);
  });

  it("handles empty string (edge case)", () => {
    expect(reportBlobPathname("")).toBe(`${BLOB_PREFIX}.json`);
  });
});

describe("saveReportAndConfirm (in-memory mode)", () => {
  const originalEnv = process.env.BLOB_READ_WRITE_TOKEN;

  beforeAll(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  afterAll(() => {
    if (originalEnv !== undefined) process.env.BLOB_READ_WRITE_TOKEN = originalEnv;
  });

  it("writes and verifies read-back in memory when Blob token unset", async () => {
    const reportId = `test-${Date.now()}`;
    const fullReport = "Test report content. " + "x".repeat(500);
    const result = await saveReportAndConfirm(
      reportId,
      {
        full_report: fullReport,
        emotional_snippet: "Test snippet",
        image_prompts: ["prompt1"],
      },
      undefined,
      { requestId: "test-req-1" }
    );

    expect(result).toEqual({ ok: true });
  });
});

describe("saveReportAndConfirm (Blob write failure)", () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeAll(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token-for-blob-failure";
    vi.mocked(put).mockRejectedValue(new Error("Blob upload failed"));
  });

  afterAll(() => {
    vi.mocked(put).mockReset();
    if (originalToken !== undefined) process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    else delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("logs report_blob_write_failed and returns { ok: false } when put throws", async () => {
    const logSpy = vi.fn();
    const fullReport = "x".repeat(600);
    const result = await saveReportAndConfirm(
      "test-report-id",
      {
        full_report: fullReport,
        emotional_snippet: "snippet",
        image_prompts: [],
      },
      logSpy as Parameters<typeof saveReportAndConfirm>[2],
      { requestId: "req-1" }
    );

    expect(result).toEqual({ ok: false, error: "Blob upload failed" });
    const failedLog = logSpy.mock.calls.find(
      (c: unknown[]) => Array.isArray(c) && c[1] === "report_blob_write_failed"
    );
    expect(failedLog).toBeDefined();
    const meta = failedLog?.[2] as Record<string, unknown>;
    expect(meta?.reportId).toBe("test-report-id");
    expect(meta?.error).toBe("Blob upload failed");
    expect(meta?.fullReportChars).toBe(600);
    expect(meta?.payloadJsonChars).toBeGreaterThan(600);
  });
});
