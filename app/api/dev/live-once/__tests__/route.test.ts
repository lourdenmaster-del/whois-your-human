/**
 * Tests for POST /api/dev/live-once — dev-only live run, rate limit, production guard.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";

const mockFetch = vi.fn();

function jsonRequest(body: unknown, url = "http://localhost:3000/api/dev/live-once") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  fullName: "Test User",
  birthDate: "1990-01-15",
  birthTime: "14:30",
  birthLocation: "New York, NY",
  email: "test@example.com",
};

const env = process.env as Record<string, string | undefined>;

describe("POST /api/dev/live-once", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    env.NODE_ENV = "development";
    vi.stubGlobal("fetch", mockFetch);
    // Reset module-level used by re-importing — but vitest caches modules.
    // We'll test 429 by calling twice; the first successful call sets used=true.
  });

  afterEach(() => {
    env.NODE_ENV = originalEnv;
    vi.unstubAllGlobals();
  });

  it("returns 403 when NODE_ENV is production", async () => {
    env.NODE_ENV = "production";

    const res = await POST(jsonRequest(validBody));

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("dev-only");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 429 on second call when first call succeeds", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
        data: { reportId: "test-id", full_report: "x", emotional_snippet: "y" },
      }),
    });

    const res1 = await POST(jsonRequest(validBody));
    expect(res1.status).toBe(200);

    const res2 = await POST(jsonRequest(validBody));
    expect(res2.status).toBe(429);
    const data2 = await res2.json();
    expect(data2.error).toContain("LIVE_ONCE already used");
  });
});
