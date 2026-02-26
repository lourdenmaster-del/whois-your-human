import { describe, it, expect } from "vitest";
import { parseVoiceProfile } from "../../schema";
import {
  buildPromptPack,
  toSystemPrompt,
  getArchetypeAnchor,
  buildSelfCheckRubric,
} from "../index";

const GOLDEN_SAMPLE = {
  id: "vp_001",
  version: "1.0.0",
  created_at: "2025-02-20T12:00:00.000Z",
  owner_user_id: "user_123",
  brand: {
    name: "LIGS Beauty",
    products: ["Serum"],
    audience: "luxury skincare",
  },
  ligs: {
    primary_archetype: "Stabiliora" as const,
    secondary_archetype: null,
    blend_weights: { Stabiliora: 1.0 },
  },
  descriptors: ["calm", "regulated", "premium"],
  cadence: {
    sentence_length: { target_words: 14, range: [8, 22] as [number, number] },
    paragraph_length: { target_sentences: 2, range: [1, 4] as [number, number] },
    rhythm_notes: "smooth transitions",
  },
  lexicon: {
    preferred_words: ["balance", "restore"],
    avoid_words: ["hack"],
    banned_words: ["guarantee", "miracle"],
  },
  formatting: {
    emoji_policy: "none",
    exclamation_policy: "rare",
    capitalization: "standard",
    bullets: "allowed",
    headline_style: "clean minimal",
  },
  claims_policy: {
    medical_claims: "prohibited",
    before_after_promises: "prohibited",
    substantiation_required: true,
    allowed_phrasing: ["may help", "supports"],
  },
  channel_adapters: {
    website: {
      tone_shift: "slightly more polished",
      structure: ["headline", "subhead", "cta"],
    },
  },
  examples: { do: ["Quiet confidence."], dont: ["Overpromising."] },
};

const profile = parseVoiceProfile(GOLDEN_SAMPLE);

describe("buildPromptPack", () => {
  it("builds system voice block with brand and archetype", () => {
    const pack = buildPromptPack(profile);
    expect(pack.systemVoiceBlock).toContain("LIGS Beauty");
    expect(pack.systemVoiceBlock).toContain("Stabiliora");
    expect(pack.systemVoiceBlock).toContain("calm");
    expect(pack.systemVoiceBlock).toContain("8–22");
  });

  it("builds channel adapter block when channel provided", () => {
    const pack = buildPromptPack(profile, { channel: "website" });
    expect(pack.channelAdapterBlock).toContain("website");
    expect(pack.channelAdapterBlock).toContain("slightly more polished");
  });

  it("builds hard constraints block", () => {
    const pack = buildPromptPack(profile);
    expect(pack.hardConstraintsBlock).toContain("guarantee");
    expect(pack.hardConstraintsBlock).toContain("medical claims");
    expect(pack.hardConstraintsBlock).toContain("emoji");
  });

  it("builds self-check block", () => {
    const pack = buildPromptPack(profile);
    expect(pack.selfCheckBlock).toContain("Self-check");
    expect(pack.selfCheckBlock).toContain("banned words");
  });
});

describe("toSystemPrompt", () => {
  it("combines all blocks into a single string", () => {
    const pack = buildPromptPack(profile, { channel: "website" });
    const prompt = toSystemPrompt(pack);
    expect(prompt).toContain("LIGS Beauty");
    expect(prompt).toContain("website");
    expect(prompt).toContain("Hard Constraints");
  });
});

describe("getArchetypeAnchor", () => {
  it("returns anchor for Stabiliora", () => {
    const anchor = getArchetypeAnchor("Stabiliora");
    expect(anchor.emotional_temperature).toBe("low");
    expect(anchor.rhythm).toContain("smooth");
  });

  it("returns anchor for all 12 archetypes", () => {
    const archetypes = [
      "Ignispectrum", "Stabiliora", "Duplicaris", "Tenebris",
      "Radiantis", "Precisura", "Aequilibris", "Obscurion",
      "Vectoris", "Structoris", "Innovaris", "Fluxionis",
    ] as const;
    for (const a of archetypes) {
      const anchor = getArchetypeAnchor(a);
      expect(anchor.notes).toBeTruthy();
      expect(anchor.lexicon_bias.length).toBeGreaterThan(0);
    }
  });
});

describe("buildSelfCheckRubric", () => {
  it("returns checklist items", () => {
    const items = buildSelfCheckRubric(profile);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.includes("banned"))).toBe(true);
  });
});
