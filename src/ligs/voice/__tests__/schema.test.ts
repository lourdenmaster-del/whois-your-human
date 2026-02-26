import { describe, it, expect } from "vitest";
import {
  parseVoiceProfile,
  safeParseVoiceProfile,
  VoiceProfileSchema,
  LigsArchetypeEnum,
  ChannelEnum,
} from "../schema";
import { zodToVoiceEngineError } from "../errors";
import { normalizeVoiceProfile } from "../normalize";

const GOLDEN_SAMPLE: Record<string, unknown> = {
  id: "vp_001",
  version: "1.0.0",
  created_at: "2025-02-20T12:00:00.000Z",
  owner_user_id: "user_123",

  brand: {
    name: "LIGS Beauty",
    products: ["Serum", "Moisturizer"],
    audience: "luxury skincare enthusiasts",
  },

  ligs: {
    primary_archetype: "Stabiliora",
    secondary_archetype: null,
    blend_weights: { Stabiliora: 1.0 },
  },

  descriptors: [
    "calm",
    "regulated",
    "premium",
    "clear",
    "warmly precise",
  ],

  cadence: {
    sentence_length: { target_words: 14, range: [8, 22] },
    paragraph_length: { target_sentences: 2, range: [1, 4] },
    rhythm_notes: "smooth transitions, balanced clauses, minimal exclamations",
  },

  lexicon: {
    preferred_words: ["balance", "restore", "steady", "signal", "support"],
    avoid_words: ["hack", "crush", "obsessed", "crazy"],
    banned_words: ["guarantee", "miracle", "cure"],
  },

  formatting: {
    emoji_policy: "none",
    exclamation_policy: "rare",
    capitalization: "standard",
    bullets: "allowed",
    headline_style: "clean minimal, title case",
  },

  claims_policy: {
    medical_claims: "prohibited",
    before_after_promises: "prohibited",
    substantiation_required: true,
    allowed_phrasing: ["may help", "supports", "designed to"],
  },

  channel_adapters: {
    website: {
      tone_shift: "slightly more polished",
      structure: ["headline", "subhead", "3 bullets", "cta"],
    },
    email: {
      tone_shift: "more direct + personal",
      structure: ["subject options", "preview line", "body", "ps"],
    },
    social_caption: {
      tone_shift: "more concise",
      structure: ["hook", "value", "soft CTA"],
    },
  },

  examples: {
    do: [
      "Quiet confidence; clarity over hype.",
      "Balanced language: precise but kind.",
    ],
    dont: [
      "Overpromising or dramatic transformations.",
      "Chaotic punctuation or excessive slang.",
    ],
  },
};

describe("VoiceProfileSchema - golden sample", () => {
  it("parses the canonical golden sample successfully", () => {
    const result = parseVoiceProfile(GOLDEN_SAMPLE);
    expect(result.id).toBe("vp_001");
    expect(result.version).toBe("1.0.0");
    expect(result.brand.name).toBe("LIGS Beauty");
    expect(result.ligs.primary_archetype).toBe("Stabiliora");
    expect(result.descriptors).toHaveLength(5);
    expect(result.cadence.sentence_length.target_words).toBe(14);
    expect(result.lexicon.banned_words).toContain("guarantee");
    expect(result.channel_adapters?.website?.tone_shift).toBe(
      "slightly more polished"
    );
  });

  it("safeParse succeeds on golden sample", () => {
    const parsed = safeParseVoiceProfile(GOLDEN_SAMPLE);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.id).toBe("vp_001");
    }
  });

  it("preserves all golden fields in output", () => {
    const result = parseVoiceProfile(GOLDEN_SAMPLE);
    expect(result.examples.do).toHaveLength(2);
    expect(result.examples.dont).toHaveLength(2);
    expect(result.claims_policy.allowed_phrasing).toContain("may help");
  });
});

describe("VoiceProfileSchema - fail cases", () => {
  it("rejects invalid archetype", () => {
    const invalid = { ...GOLDEN_SAMPLE, ligs: { ...(GOLDEN_SAMPLE.ligs as Record<string, unknown>), primary_archetype: "InvalidArchetype" } };
    const parsed = safeParseVoiceProfile(invalid);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid version (non-semver)", () => {
    const invalid = { ...GOLDEN_SAMPLE, version: "1.0" };
    const parsed = safeParseVoiceProfile(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid created_at (non-datetime)", () => {
    const invalid = { ...GOLDEN_SAMPLE, created_at: "2025-02-20" };
    const parsed = safeParseVoiceProfile(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects empty descriptors (min 3 required)", () => {
    const invalid = { ...GOLDEN_SAMPLE, descriptors: [] };
    const parsed = safeParseVoiceProfile(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects descriptors with fewer than 3 items", () => {
    const invalid = { ...GOLDEN_SAMPLE, descriptors: ["calm", "clear"] };
    const parsed = safeParseVoiceProfile(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects cadence range with min > max", () => {
    const invalid = {
      ...GOLDEN_SAMPLE,
      cadence: {
        ...(GOLDEN_SAMPLE.cadence as Record<string, unknown>),
        sentence_length: { target_words: 14, range: [22, 8] },
      },
    };
    const parsed = safeParseVoiceProfile(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects blend_weights sum > 1.0", () => {
    const invalid = {
      ...GOLDEN_SAMPLE,
      ligs: {
        ...(GOLDEN_SAMPLE.ligs as Record<string, unknown>),
        blend_weights: { Stabiliora: 0.6, Radiantis: 0.5 },
      },
    };
    const parsed = safeParseVoiceProfile(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects empty id", () => {
    const invalid = { ...GOLDEN_SAMPLE, id: "" };
    const parsed = safeParseVoiceProfile(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects non-integer sentence target_words", () => {
    const invalid = {
      ...GOLDEN_SAMPLE,
      cadence: {
        ...(GOLDEN_SAMPLE.cadence as Record<string, unknown>),
        sentence_length: { target_words: 14.5, range: [8, 22] },
      },
    };
    const parsed = safeParseVoiceProfile(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe("LigsArchetypeEnum", () => {
  it("accepts all 12 archetypes", () => {
    const archetypes = [
      "Ignispectrum",
      "Stabiliora",
      "Duplicaris",
      "Tenebris",
      "Radiantis",
      "Precisura",
      "Aequilibris",
      "Obscurion",
      "Vectoris",
      "Structoris",
      "Innovaris",
      "Fluxionis",
    ];
    for (const a of archetypes) {
      expect(LigsArchetypeEnum.safeParse(a).success).toBe(true);
    }
  });

  it("rejects unknown archetype", () => {
    expect(LigsArchetypeEnum.safeParse("Unknown").success).toBe(false);
  });
});

describe("ChannelEnum", () => {
  it("accepts valid channels", () => {
    expect(ChannelEnum.safeParse("website").success).toBe(true);
    expect(ChannelEnum.safeParse("email").success).toBe(true);
    expect(ChannelEnum.safeParse("social_caption").success).toBe(true);
    expect(ChannelEnum.safeParse("longform").success).toBe(true);
    expect(ChannelEnum.safeParse("ads").success).toBe(true);
  });

  it("rejects unknown channel", () => {
    expect(ChannelEnum.safeParse("instagram").success).toBe(false);
  });
});

describe("zodToVoiceEngineError", () => {
  it("converts ZodError to VoiceEngineError", () => {
    const parsed = safeParseVoiceProfile({});
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const err = zodToVoiceEngineError(parsed.error);
      expect(err.kind).toBe("VALIDATION_ERROR");
      expect(err.message).toBe("VoiceProfile validation failed");
      if (err.kind === "VALIDATION_ERROR") {
        expect(err.issues.length).toBeGreaterThan(0);
        expect(err.issues[0]).toHaveProperty("path");
        expect(err.issues[0]).toHaveProperty("message");
      }
    }
  });
});

describe("normalizeVoiceProfile", () => {
  it("trims brand name and descriptors", () => {
    const raw = {
      ...GOLDEN_SAMPLE,
      brand: {
        ...(GOLDEN_SAMPLE.brand as Record<string, unknown>),
        name: "  LIGS Beauty  ",
      },
      descriptors: ["  calm  ", "regulated", "  clear  "],
    };
    const out = normalizeVoiceProfile(raw);
    expect(out).not.toBeNull();
    expect(out!.brand.name).toBe("LIGS Beauty");
    expect(out!.descriptors).toEqual(["calm", "regulated", "clear"]);
  });

  it("dedupes lexicon arrays case-insensitively", () => {
    const raw = {
      ...GOLDEN_SAMPLE,
      lexicon: {
        preferred_words: ["Balance", "balance", "RESTORE", "restore", "steady"],
        avoid_words: [],
        banned_words: [],
      },
    };
    const out = normalizeVoiceProfile(raw);
    expect(out).not.toBeNull();
    expect(out!.lexicon.preferred_words).toEqual(["Balance", "RESTORE", "steady"]);
  });

  it("returns null on invalid input", () => {
    expect(normalizeVoiceProfile(null)).toBeNull();
    expect(normalizeVoiceProfile(123)).toBeNull();
    expect(normalizeVoiceProfile("string")).toBeNull();
  });

  it("returns null when parse fails (e.g. empty descriptors)", () => {
    const invalid = { ...GOLDEN_SAMPLE, descriptors: [] };
    expect(normalizeVoiceProfile(invalid)).toBeNull();
  });
});
