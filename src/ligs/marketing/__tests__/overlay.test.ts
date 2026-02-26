import { describe, it, expect } from "vitest";
import { parseVoiceProfile } from "../../voice/schema";
import {
  generateOverlaySpec,
  validateOverlaySpec,
  getTemplate,
} from "../index";

const stabilioraProfile = parseVoiceProfile({
  id: "vp_stab",
  version: "1.0.0",
  created_at: "2025-02-20T12:00:00.000Z",
  owner_user_id: "u1",
  brand: { name: "LIGS Beauty", products: [], audience: "" },
  ligs: { primary_archetype: "Stabiliora", secondary_archetype: null, blend_weights: {} },
  descriptors: ["calm", "regulated", "premium", "clear", "warmly precise"],
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

describe("generateOverlaySpec - Stabiliora", () => {
  it("generates calm headline (no hype words), emojiPolicy none, exclamation rare/none, spacing balanced or airy", async () => {
    const spec = await generateOverlaySpec(stabilioraProfile, {
      purpose: "landing_hero",
      templateId: "square_card_v1",
    });
    expect(spec.copy.headline).toBeDefined();
    expect(spec.copy.headline.length).toBeLessThanOrEqual(60);
    expect(spec.copy.headline.toLowerCase()).not.toMatch(/miracle|guaranteed|instant|transform/);
    expect(spec.styleTokens.emojiPolicy).toBe("none");
    expect(["none", "rare"]).toContain(spec.styleTokens.exclamationPolicy);
    expect(["balanced", "airy"]).toContain(spec.styleTokens.spacing);
  });
});

describe("templates - deterministic placements", () => {
  it("placements are static: same output for same templateId+aspectRatio regardless of variationKey", async () => {
    const specA = await generateOverlaySpec(stabilioraProfile, {
      purpose: "test",
      templateId: "square_card_v1",
      variationKey: "a",
    });
    const specB = await generateOverlaySpec(stabilioraProfile, {
      purpose: "test",
      templateId: "square_card_v1",
      variationKey: "b",
    });
    expect(specA.placement).toEqual(specB.placement);
  });

  it("getTemplate returns consistent static layout", () => {
    const p1 = getTemplate("square_card_v1", "1:1");
    const p2 = getTemplate("square_card_v1", "1:1");
    expect(p1).toEqual(p2);
    expect(p1.safeArea).toEqual({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
    expect(p1.logo.anchor).toBe("br");
    expect(p1.ctaChip).toBeDefined();
  });
});

describe("generateOverlaySpec - copy from marketingDescriptor", () => {
  it("copy is descriptor-derived (archetypeLabel, tagline, ctaText) and deterministic per archetype", async () => {
    const specA = await generateOverlaySpec(stabilioraProfile, {
      purpose: "test",
      templateId: "square_card_v1",
      variationKey: "x",
    });
    const specB = await generateOverlaySpec(stabilioraProfile, {
      purpose: "test",
      templateId: "square_card_v1",
      variationKey: "y",
    });
    expect(specA.placement).toEqual(specB.placement);
    expect(specA.copy.headline).toBe(specB.copy.headline);
    expect(specA.copy.subhead).toBe(specB.copy.subhead);
    expect(specA.copy.cta).toBe(specB.copy.cta);
    expect(specA.copy.headline).toBe("Stabiliora");
    expect(specA.copy.subhead).toContain("Restore balance");
  });
});

describe("validateOverlaySpec - banned words", () => {
  it("banned words trigger errors", async () => {
    const spec = await generateOverlaySpec(stabilioraProfile, {
      purpose: "test",
      templateId: "square_card_v1",
    });
    spec.copy.headline = "This product will cure your skin";
    spec.constraints.bannedWords = ["cure"];
    const result = validateOverlaySpec(spec);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.rule === "banned_words" || i.rule === "medical_claims")).toBe(true);
  });

  it("passes when no banned words in copy", async () => {
    const spec = await generateOverlaySpec(stabilioraProfile, {
      purpose: "test",
      templateId: "square_card_v1",
    });
    spec.constraints.bannedWords = ["spam"];
    const result = validateOverlaySpec(spec);
    expect(result.pass).toBe(true);
    expect(result.score).toBe(100);
  });
});

describe("validateOverlaySpec - medical claims and guarantees", () => {
  it("fails when medical claim in copy", async () => {
    const spec = await generateOverlaySpec(stabilioraProfile, {
      purpose: "test",
      templateId: "square_card_v1",
    });
    spec.copy.headline = "Cures wrinkles instantly";
    spec.constraints.noMedicalClaims = true;
    const result = validateOverlaySpec(spec);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.rule === "medical_claims")).toBe(true);
  });

  it("fails when guarantee in copy", async () => {
    const spec = await generateOverlaySpec(stabilioraProfile, {
      purpose: "test",
      templateId: "square_card_v1",
    });
    spec.copy.headline = "Guaranteed results";
    spec.constraints.noGuarantees = true;
    const result = validateOverlaySpec(spec);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.rule === "no_guarantees")).toBe(true);
  });
});
