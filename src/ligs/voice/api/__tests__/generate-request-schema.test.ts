import { describe, it, expect } from "vitest";
import {
  parseGenerateVoiceRequest,
  GenerateVoiceRequestSchema,
} from "../generate-request-schema";
import { parseVoiceProfile } from "../../schema";

const validProfile = parseVoiceProfile({
  id: "vp_001",
  version: "1.0.0",
  created_at: "2025-02-20T12:00:00.000Z",
  owner_user_id: "u1",
  brand: { name: "Test", products: [], audience: "" },
  ligs: { primary_archetype: "Stabiliora", secondary_archetype: null, blend_weights: {} },
  descriptors: ["calm", "clear", "precise"],
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

describe("GenerateVoiceRequestSchema", () => {
  it("parses valid request", () => {
    const result = parseGenerateVoiceRequest({
      profile: validProfile,
      task: "Write a product description for our serum.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.task).toBe("Write a product description for our serum.");
      expect(result.data.profile.brand.name).toBe("Test");
      expect(result.data.minScore).toBe(80);
    }
  });

  it("rejects task shorter than 10 chars", () => {
    const result = parseGenerateVoiceRequest({
      profile: validProfile,
      task: "Short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects task longer than 5000 chars", () => {
    const result = parseGenerateVoiceRequest({
      profile: validProfile,
      task: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid channel", () => {
    const result = parseGenerateVoiceRequest({
      profile: validProfile,
      task: "Write a product description.",
      channel: "instagram",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid channel", () => {
    const result = parseGenerateVoiceRequest({
      profile: validProfile,
      task: "Write a product description.",
      channel: "email",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.channel).toBe("email");
  });

  it("rejects maxWords > 2000", () => {
    const result = parseGenerateVoiceRequest({
      profile: validProfile,
      task: "Write a product description.",
      constraints: { maxWords: 2001 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts constraints with maxWords <= 2000", () => {
    const result = parseGenerateVoiceRequest({
      profile: validProfile,
      task: "Write a product description.",
      constraints: { maxWords: 500, includeKeywords: ["organic"], excludeKeywords: ["cheap"] },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.constraints?.maxWords).toBe(500);
      expect(result.data.constraints?.includeKeywords).toEqual(["organic"]);
      expect(result.data.constraints?.excludeKeywords).toEqual(["cheap"]);
    }
  });

  it("rejects minScore outside 0-100", () => {
    expect(parseGenerateVoiceRequest({ profile: validProfile, task: "x".repeat(10), minScore: -1 }).success).toBe(false);
    expect(parseGenerateVoiceRequest({ profile: validProfile, task: "x".repeat(10), minScore: 101 }).success).toBe(false);
  });

  it("rejects invalid profile", () => {
    const result = parseGenerateVoiceRequest({
      profile: { id: "x" },
      task: "Write a product description.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys (allowExternalWrites)", () => {
    const result = parseGenerateVoiceRequest({
      profile: validProfile,
      task: "Write a product description.",
      allowExternalWrites: true,
    });
    expect(result.success).toBe(false);
  });
});
