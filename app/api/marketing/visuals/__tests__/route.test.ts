/**
 * Tests for POST /api/marketing/visuals.
 * Mocks image/generate by setting ALLOW_EXTERNAL_WRITES false (DRY_RUN returns empty images).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "../route";

describe("POST /api/marketing/visuals", () => {
  const baseUrl = "http://localhost:3000";

  beforeEach(() => {
    process.env.ALLOW_EXTERNAL_WRITES = "false";
  });

  it("returns 400 for invalid body", async () => {
    const req = new Request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing primary_archetype", async () => {
    const req = new Request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 with structure (DRY_RUN yields warnings)", async () => {
    const req = new Request(`${baseUrl}/api/marketing/visuals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary_archetype: "Stabiliora",
        variationKey: "demo-1",
        contrastDelta: 0.15,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("logoMark");
    expect(data).toHaveProperty("marketingBackground");
    expect(data).toHaveProperty("warnings");
    expect(Array.isArray(data.warnings)).toBe(true);
    expect(data.warnings).toContain("No logoMark returned from image/generate");
    expect(data.warnings).toContain("No marketingBackground returned from image/generate");
  });

  it("unknown archetype returns 200 with warnings, does not throw", async () => {
    const req = new Request(`${baseUrl}/api/marketing/visuals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary_archetype: "UnknownArchetype",
        contrastDelta: 0.2,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("logoMark");
    expect(data).toHaveProperty("marketingBackground");
    expect(data).toHaveProperty("warnings");
    expect(Array.isArray(data.warnings)).toBe(true);
    expect(data.warnings.length).toBeGreaterThan(0);
  });
});
