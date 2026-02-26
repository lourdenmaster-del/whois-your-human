/**
 * Tests for POST /api/marketing/generate.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

vi.mock("@/src/ligs/image/provider", () => ({
  generateImagesViaProvider: vi.fn().mockResolvedValue([{ url: "https://example.com/marketing.png" }]),
}));

describe("POST /api/marketing/generate", () => {
  const baseUrl = "http://localhost:3000";

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("returns 200 with descriptor for valid request (DRY_RUN)", async () => {
    const orig = process.env.ALLOW_EXTERNAL_WRITES;
    process.env.ALLOW_EXTERNAL_WRITES = "false";
    const req = new Request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary_archetype: "Stabiliora",
        variationKey: "demo-1",
        contrastDelta: 0.15,
      }),
    });
    const res = await POST(req);
    process.env.ALLOW_EXTERNAL_WRITES = orig;

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.descriptor).toBeDefined();
    expect(data.descriptor.archetypeLabel).toBe("Stabiliora");
    expect(data.descriptor.tagline).toBeDefined();
    expect(data.descriptor.hitPoints).toBeInstanceOf(Array);
    expect(data.descriptor.ctaText).toBeDefined();
    expect(data.assets).toBeDefined();
    expect(data.dryRun).toBe(true);
  });
});
