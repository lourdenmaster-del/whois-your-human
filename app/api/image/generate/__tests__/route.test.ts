/**
 * Integration tests for POST /api/image/generate.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { parseVoiceProfile } from "@/src/ligs/voice/schema";
import { generateImagesViaProvider } from "@/src/ligs/image/provider";

vi.mock("@/src/ligs/image/provider", () => ({
  generateImagesViaProvider: vi.fn().mockResolvedValue([{ url: "https://example.com/img1.png" }]),
  PROVIDER_NAME: "dall-e-3",
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

function jsonRequest(body: unknown) {
  return new Request("http://test/api/image/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/image/generate", () => {
  it("returns 400 IMAGE_REQUEST_INVALID for invalid body (malformed JSON)", async () => {
    const req = new Request("http://test/api/image/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("IMAGE_REQUEST_INVALID");
  });

  it("returns 400 IMAGE_REQUEST_INVALID for missing purpose", async () => {
    const req = jsonRequest({
      profile: validProfile,
      image: { aspectRatio: "1:1", size: "1024", count: 1 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("IMAGE_REQUEST_INVALID");
  });

  it("returns 400 IMAGE_REQUEST_INVALID for purpose too short", async () => {
    const req = jsonRequest({
      profile: validProfile,
      image: { aspectRatio: "1:1", size: "1024", count: 1 },
      purpose: "ab",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("IMAGE_REQUEST_INVALID");
  });

  it("returns 400 VOICE_PROFILE_INVALID for invalid profile", async () => {
    const req = jsonRequest({
      profile: { id: "x" },
      image: { aspectRatio: "1:1", size: "1024", count: 1 },
      purpose: "beauty_signature_background",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("VOICE_PROFILE_INVALID");
  });

  it("returns 400 for invalid image.count (>4)", async () => {
    const req = jsonRequest({
      profile: validProfile,
      image: { aspectRatio: "1:1", size: "1024", count: 5 },
      purpose: "beauty_signature_background",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 DRY_RUN payload when ALLOW_EXTERNAL_WRITES false", async () => {
    const req = jsonRequest({
      profile: validProfile,
      image: { aspectRatio: "1:1", size: "1024", count: 1 },
      purpose: "beauty_signature_background",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.requestId).toBeDefined();
    expect(data.images).toEqual([]);
    expect(data.spec).toBeDefined();
    expect(data.spec.prompt.positive).toBeTruthy();
    expect(data.spec.prompt.negative).toBeTruthy();
    expect(data.validation).toBeDefined();
    expect(data.dryRun).toBe(true);
    expect(data.providerUsed).toBe(null);
    expect(data.cacheHit).toBe(false);
  });

  it("returns 400 IMAGE_REQUEST_INVALID for raw prompt strings from client", async () => {
    const req = jsonRequest({
      profile: validProfile,
      image: { aspectRatio: "1:1", size: "1024", count: 1 },
      purpose: "beauty_signature_background",
      prompt: "user-supplied raw prompt",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("IMAGE_REQUEST_INVALID");
  });

  it("returns 400 IMAGE_REQUEST_INVALID for client-supplied dryRun", async () => {
    const req = jsonRequest({
      profile: validProfile,
      image: { aspectRatio: "1:1", size: "1024", count: 1 },
      purpose: "beauty_signature_background",
      dryRun: true,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 IMAGE_SPEC_INVALID when spec fails validation", async () => {
    const profileWithDisallowedDescriptor = parseVoiceProfile({
      ...validProfile,
      id: "vp_bad",
      descriptors: ["calm", "face", "premium", "regulated", "clear"],
    });
    const req = jsonRequest({
      profile: profileWithDisallowedDescriptor,
      image: { aspectRatio: "1:1", size: "1024", count: 1 },
      purpose: "beauty_signature_background",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("IMAGE_SPEC_INVALID");
    expect(data.issues).toBeDefined();
    expect(Array.isArray(data.issues)).toBe(true);
  });

  it("accepts optional archetype override", async () => {
    const req = jsonRequest({
      profile: validProfile,
      archetype: "Radiantis",
      image: { aspectRatio: "16:9", size: "1536", count: 2 },
      purpose: "hero_background",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.spec.ligs.primary_archetype).toBe("Radiantis");
  });

  it("returns rich DRY payload for archetype_background_from_glyph with Ignispectrum", async () => {
    const ignisProfile = parseVoiceProfile({
      ...validProfile,
      id: "exemplar_Ignispectrum_v1",
      ligs: { primary_archetype: "Ignispectrum", secondary_archetype: null, blend_weights: {} },
    });
    const req = jsonRequest({
      profile: ignisProfile,
      purpose: "archetype_background_from_glyph",
      image: { aspectRatio: "1:1", size: "1024", count: 1 },
      variationKey: "exemplar-v1",
      archetype: "Ignispectrum",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.dryRun).toBe(true);
    expect(data.providerUsed).toBe("dalle2_edits");
    expect(data.glyphDryPlan).toBeDefined();
    expect(data.glyphDryPlan.glyphLoaded).toEqual({ path: "public/glyphs/ignis.svg", rasterizedTo: "1024x1024" });
    expect(data.glyphDryPlan.maskCreated).toEqual({ size: "1024x1024", transparent: true });
    expect(data.glyphDryPlan.finalPromptContainsSeedGrowth).toBe(true);
    expect(typeof data.glyphDryPlan.finalPrompt).toBe("string");
    expect(data.glyphDryPlan.finalPrompt).toMatch(/seed|grows/i);
    expect(data.glyphDryPlan.fileUrlPlan).toBeDefined();
    expect(data.glyphDryPlan.fileUrlPlan.live).toContain("saveExemplarToBlob");
    expect(data.glyphDryPlan.fileUrlPlan.live).toContain("marketing_background");
  });
});

describe("POST /api/image/generate - cache", () => {
  beforeEach(() => {
    vi.stubEnv("ALLOW_EXTERNAL_WRITES", "true");
    vi.mocked(generateImagesViaProvider).mockClear();
  });

  it("first call cacheHit false, second identical call cacheHit true and does not call provider", async () => {
    const body = {
      profile: validProfile,
      image: { aspectRatio: "1:1", size: "1024", count: 1 },
      purpose: "beauty_signature_background",
      idempotencyKey: "a1b2c3d4-e5f6-4789-a012-345678901234",
    };
    const req1 = jsonRequest(body);
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.cacheHit).toBe(false);
    expect(data1.dryRun).toBe(false);
    expect(data1.images).toHaveLength(1);
    expect(data1.images[0].url).toBeDefined();

    const req2 = jsonRequest(body);
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.cacheHit).toBe(true);

    expect(generateImagesViaProvider).toHaveBeenCalledTimes(1);
  });
});
