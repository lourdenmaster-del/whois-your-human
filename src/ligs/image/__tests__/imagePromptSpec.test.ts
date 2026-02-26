import { describe, it, expect } from "vitest";
import { parseVoiceProfile } from "../../voice/schema";
import {
  buildImagePromptSpec,
  validateImagePromptSpec,
  safeParseImagePromptSpec,
  type ImagePromptSpec,
} from "../index";

const stabilioraProfile = parseVoiceProfile({
  id: "vp_stab",
  version: "1.0.0",
  created_at: "2025-02-20T12:00:00.000Z",
  owner_user_id: "u1",
  brand: { name: "LIGS Beauty", products: [], audience: "" },
  ligs: {
    primary_archetype: "Stabiliora",
    secondary_archetype: null,
    blend_weights: {},
  },
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

describe("buildImagePromptSpec - Stabiliora", () => {
  it("marketing with Stabiliora uses Stabiliora visual (unchanged)", () => {
    const spec = buildImagePromptSpec(stabilioraProfile, {
      purpose: "marketing_logo_mark",
    });
    expect(spec.style.mood).toBe("calm, regulated, coherent");
    expect(spec.style.palette).toContain("warm-neutral");
  });

  it("marketing with raw_Unknown in variationKey uses NEUTRAL_FALLBACK.visual", () => {
    const spec = buildImagePromptSpec(stabilioraProfile, {
      purpose: "marketing_logo_mark",
      variationKey: "raw_UnknownArchetype_cd0.15",
    });
    expect(spec.style.mood).toBe("premium, minimal, refined");
    expect(spec.style.palette).toContain("neutral");
  });

  it("palette includes soft neutrals, contrast low, symmetry medium/high, flow_lines subtle or present", () => {
    const spec = buildImagePromptSpec(stabilioraProfile, {
      purpose: "beauty_signature_background",
    });
    expect(spec.style.palette).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/warm-neutral|soft|muted|neutral/i),
      ])
    );
    expect(spec.style.palette.some((c) => /soft neutrals|soft earth|muted|warm-neutral/i.test(c))).toBe(true);
    expect(spec.style.contrast_level).toBe("low");
    expect(["medium", "high"]).toContain(spec.composition.symmetry);
    expect(["subtle", "present"]).toContain(spec.composition.flow_lines);
  });
});

describe("buildImagePromptSpec - negative prompt", () => {
  it("contains all required exclusions", () => {
    const spec = buildImagePromptSpec(stabilioraProfile, {
      purpose: "beauty_signature_background",
    });
    const neg = spec.prompt.negative.toLowerCase();
    expect(neg).toContain("text");
    expect(neg).toContain("logo");
    expect(neg).toContain("watermark");
    expect(neg).toContain("signature");
    expect(neg).toContain("face");
    expect(neg).toContain("person");
    expect(neg).toContain("figure");
    expect(neg).toContain("silhouette");
    expect(neg).toContain("astrology");
    expect(neg).toContain("zodiac");
    expect(neg).toContain("symbols");
    expect(neg).toContain("busy texture");
    expect(neg).toContain("high contrast");
  });
});

describe("buildImagePromptSpec - variation", () => {
  it("different variationKey yields different motifs deterministically", () => {
    const specA = buildImagePromptSpec(stabilioraProfile, {
      purpose: "beauty_signature_background",
      variationKey: "a",
    });
    const specB = buildImagePromptSpec(stabilioraProfile, {
      purpose: "beauty_signature_background",
      variationKey: "b",
    });
    expect(specA.variation.variationId).not.toBe(specB.variation.variationId);
    expect(specA.variation.motifs).not.toEqual(specB.variation.motifs);
  });

  it("same variationKey yields same motifs", () => {
    const specA = buildImagePromptSpec(stabilioraProfile, {
      purpose: "beauty_signature_background",
      variationKey: "x",
    });
    const specB = buildImagePromptSpec(stabilioraProfile, {
      purpose: "beauty_signature_background",
      variationKey: "x",
    });
    expect(specA.variation.variationId).toBe(specB.variation.variationId);
    expect(specA.variation.motifs).toEqual(specB.variation.motifs);
  });
});

describe("validateImagePromptSpec", () => {
  it("passes for valid spec from buildImagePromptSpec", () => {
    const spec = buildImagePromptSpec(stabilioraProfile, {
      purpose: "beauty_signature_background",
    });
    const result = validateImagePromptSpec(spec);
    expect(result.pass).toBe(true);
    expect(result.score).toBe(100);
  });

  it("fails when negative prompt missing exclusions", () => {
    const spec = buildImagePromptSpec(stabilioraProfile, {
      purpose: "beauty_signature_background",
    });
    spec.prompt.negative = "no color";
    const result = validateImagePromptSpec(spec);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.rule === "negative_prompt_exclusion")).toBe(true);
  });

  it("fails when positive prompt contains disallowed patterns", () => {
    const spec = buildImagePromptSpec(stabilioraProfile, {
      purpose: "beauty_signature_background",
    });
    spec.prompt.positive = "A face with text and logo";
    const result = validateImagePromptSpec(spec);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.rule === "positive_prompt_disallowed")).toBe(true);
  });

  it("fails when constraints missing or false", () => {
    const spec = buildImagePromptSpec(stabilioraProfile, {
      purpose: "beauty_signature_background",
    });
    spec.constraints.no_faces = false as never;
    const result = validateImagePromptSpec(spec);
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.message.includes("no_faces"))).toBe(true);
  });
});

describe("ImagePromptSpecSchema", () => {
  const validSpec: ImagePromptSpec = {
    id: "img_1",
    version: "1.0.0",
    created_at: "2025-02-20T12:00:00.000Z",
    ligs: { primary_archetype: "Stabiliora", secondary_archetype: null, blend_weights: {} },
    purpose: "beauty_signature_background",
    style: {
      mood: "calm",
      palette: ["warm-neutral", "soft neutrals"],
      materials: ["organic", "natural"],
      lighting: "soft",
      texture_level: "low",
      contrast_level: "low",
    },
    composition: {
      layout: "centered",
      symmetry: "medium",
      negative_space: "high",
      focal_behavior: "single point",
      flow_lines: "subtle",
    },
    constraints: {
      no_text: true,
      no_logos: true,
      no_faces: true,
      no_figures: true,
      no_symbols: true,
      no_astrology: true,
      avoid_busy_textures: true,
    },
    output: { aspectRatio: "1:1", size: "1024", count: 1 },
    prompt: {
      positive: "Abstract calm scene",
      negative:
        "text, letters, logo, watermark, signature, face, person, figure, silhouette, astrology, zodiac, symbols, busy texture, high contrast",
    },
    variation: {
      variationId: "var_abc",
      motifs: ["subtle grain", "soft sheen"],
      randomnessLevel: 0.2,
    },
  };

  it("parses valid spec", () => {
    const result = safeParseImagePromptSpec(validSpec);
    expect(result.success).toBe(true);
  });

  it("rejects missing constraints", () => {
    const invalid = { ...validSpec };
    delete (invalid as Record<string, unknown>).constraints;
    const result = safeParseImagePromptSpec(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects no_text !== true", () => {
    const invalid = {
      ...validSpec,
      constraints: { ...validSpec.constraints, no_text: false },
    };
    const result = safeParseImagePromptSpec(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing purpose", () => {
    const invalid = { ...validSpec };
    delete (invalid as Record<string, unknown>).purpose;
    const result = safeParseImagePromptSpec(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing variation", () => {
    const invalid = { ...validSpec };
    delete (invalid as Record<string, unknown>).variation;
    const result = safeParseImagePromptSpec(invalid);
    expect(result.success).toBe(false);
  });
});
