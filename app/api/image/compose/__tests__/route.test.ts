import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { parseVoiceProfile } from "@/src/ligs/voice/schema";

/** Mock fs so global logo appears missing — compose falls back to placeholder or returns 400. */
vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn().mockRejectedValue(new Error("ENOENT")),
  },
}));

const validProfile = parseVoiceProfile({
  id: "vp_test",
  version: "1.0.0",
  created_at: "2025-02-20T12:00:00.000Z",
  owner_user_id: "u1",
  brand: { name: "Test", products: [], audience: "" },
  ligs: { primary_archetype: "Stabiliora", secondary_archetype: null, blend_weights: {} },
  descriptors: ["calm", "regulated", "premium"],
  cadence: {
    sentence_length: { target_words: 14, range: [8, 22] },
    paragraph_length: { target_sentences: 2, range: [1, 4] },
  },
  lexicon: { preferred_words: [], avoid_words: [], banned_words: [] },
  formatting: {
    emoji_policy: "none",
    exclamation_policy: "rare",
    capitalization: "standard",
    bullets: "allowed",
    headline_style: "",
  },
  claims_policy: {
    medical_claims: "prohibited",
    before_after_promises: "prohibited",
    substantiation_required: true,
    allowed_phrasing: [],
  },
  channel_adapters: {},
  examples: { do: [], dont: [] },
});

const tinyPngB64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQHwAEBgIApD5fRAAAAABJRU5ErkJggg==";

function jsonRequest(body: unknown) {
  return new Request("http://test/api/image/compose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/image/compose", () => {
  it("returns 400 COMPOSE_REQUEST_INVALID for invalid body (malformed JSON)", async () => {
    const req = new Request("http://test/api/image/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("COMPOSE_REQUEST_INVALID");
  });

  it("returns 400 COMPOSE_REQUEST_INVALID for missing purpose", async () => {
    const req = jsonRequest({
      profile: validProfile,
      background: { b64: tinyPngB64 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("COMPOSE_REQUEST_INVALID");
  });

  it("returns 400 COMPOSE_REQUEST_INVALID for missing background", async () => {
    const req = jsonRequest({
      profile: validProfile,
      purpose: "landing_hero",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 VOICE_PROFILE_INVALID for invalid profile", async () => {
    const req = jsonRequest({
      profile: { id: "x" },
      background: { b64: tinyPngB64 },
      purpose: "landing_hero",
      output: { size: "1024" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("VOICE_PROFILE_INVALID");
  });

  it("returns 200 DRY_RUN with overlaySpec and overlayValidation when ALLOW_EXTERNAL_WRITES false", async () => {
    const req = jsonRequest({
      profile: validProfile,
      background: { b64: tinyPngB64 },
      purpose: "landing_hero",
      output: { size: "1024" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.requestId).toBeDefined();
    expect(data.dryRun).toBe(true);
    expect(data.overlaySpec).toBeDefined();
    expect(data.overlaySpec.copy.headline).toBeDefined();
    expect(data.overlayValidation).toBeDefined();
    expect(data.overlayValidation.pass).toBe(true);
    expect(data.image).toBeUndefined();
  });

  it("valid overlay spec passes validation", async () => {
    const req = jsonRequest({
      profile: validProfile,
      background: { b64: tinyPngB64 },
      purpose: "landing_hero",
      output: { size: "1024" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.overlayValidation.pass).toBe(true);
  });

  it("uses provided overlaySpec when given (no regeneration)", async () => {
    const customSpec = {
      id: "overlay_custom_1",
      version: "1.0.0",
      created_at: new Date().toISOString(),
      templateId: "square_card_v1" as const,
      output: { aspectRatio: "1:1" as const, size: "1024" as const },
      copy: { headline: "Custom Headline", subhead: "Custom subhead", cta: "Learn More" },
      placement: {
        safeArea: { x: 0.08, y: 0.08, w: 0.84, h: 0.84 },
        logo: { anchor: "br" as const, paddingPct: 0.05, maxWidthPct: 0.18 },
        textBlock: { box: { x: 0.12, y: 0.18, w: 0.76, h: 0.52 }, align: "center" as const },
        ctaChip: { box: { x: 0.32, y: 0.72, w: 0.36, h: 0.1 }, align: "center" as const },
      },
      styleTokens: { spacing: "balanced" as const, emojiPolicy: "none" as const, exclamationPolicy: "rare" as const, typography: { headlineSize: "lg" as const, subheadSize: "sm" as const, weight: "regular" as const } },
      constraints: { bannedWords: [], noMedicalClaims: true, noGuarantees: true },
    };
    const req = jsonRequest({
      profile: validProfile,
      background: { b64: tinyPngB64 },
      purpose: "landing_hero",
      output: { size: "1024" },
      overlaySpec: customSpec,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.overlaySpec.copy.headline).toBe("Custom Headline");
    expect(data.overlaySpec.copy.subhead).toBe("Custom subhead");
    expect(data.overlaySpec.copy.cta).toBe("Learn More");
  });
});

describe("POST /api/image/compose - live (mocked)", () => {
  beforeEach(() => {
    vi.stubEnv("ALLOW_EXTERNAL_WRITES", "true");
    vi.stubEnv("ENABLE_PLACEHOLDER_LOGO", "true");
  });

  it("returns image b64 and contentType when compose succeeds with placeholder logo", async () => {
    const req = jsonRequest({
      profile: validProfile,
      background: { b64: tinyPngB64 },
      purpose: "landing_hero",
      output: { size: "1024" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.dryRun).toBe(false);
    expect(data.logoUsed).toBe("placeholder");
    expect(data.image).toBeDefined();
    expect(data.image.b64).toBeDefined();
    expect(typeof data.image.b64).toBe("string");
    expect(data.image.contentType).toBe("image/png");
  });

  it("placeholder logo respects placement and scaling (1024 and 1536)", async () => {
    for (const size of ["1024", "1536"] as const) {
      const req = jsonRequest({
        profile: validProfile,
        background: { b64: tinyPngB64 },
        purpose: "landing_hero",
        output: { size },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.logoUsed).toBe("placeholder");
      const dim = size === "1024" ? 1024 : 1536;
      const buf = Buffer.from(data.image.b64, "base64");
      expect(buf.length).toBeGreaterThan(100);
    }
  });
});

describe("POST /api/image/compose - no logo and placeholder disabled", () => {
  beforeEach(() => {
    vi.stubEnv("ALLOW_EXTERNAL_WRITES", "true");
    vi.stubEnv("ENABLE_PLACEHOLDER_LOGO", "false");
  });

  it("returns 400 BRAND_LOGO_REQUIRED when global logo missing and ENABLE_PLACEHOLDER_LOGO not set", async () => {
    const req = jsonRequest({
      profile: validProfile,
      background: { b64: tinyPngB64 },
      purpose: "landing_hero",
      output: { size: "1024" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("BRAND_LOGO_REQUIRED");
    expect(data.message).toMatch(/global logo|ligs-mark-primary/);
  });
});
