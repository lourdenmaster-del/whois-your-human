import { describe, it, expect } from "vitest";
import { parseVoiceProfile } from "../../schema";
import {
  validateVoiceOutput,
  validateBannedWords,
  validateClaims,
  validateCadence,
  validateFormatting,
} from "../index";

const profile = parseVoiceProfile({
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
  lexicon: {
    preferred_words: ["balance"],
    avoid_words: ["hack"],
    banned_words: ["guarantee", "miracle", "cure"],
  },
  formatting: { emoji_policy: "none", exclamation_policy: "rare", capitalization: "standard", bullets: "allowed", headline_style: "" },
  claims_policy: { medical_claims: "prohibited", before_after_promises: "prohibited", substantiation_required: true, allowed_phrasing: [] },
  channel_adapters: {},
  examples: { do: [], dont: [] },
});

describe("validateBannedWords", () => {
  it("fails when banned word present", () => {
    const r = validateBannedWords("This will guarantee results!", profile);
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "banned_words")).toBe(true);
  });

  it("passes when no banned words", () => {
    const r = validateBannedWords("This supports balance and clarity.", profile);
    expect(r.pass).toBe(true);
  });
});

describe("validateClaims", () => {
  it("fails on medical claim", () => {
    const r = validateClaims("This cream cures wrinkles.", profile);
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "medical_claims")).toBe(true);
  });

  it("passes on safe phrasing", () => {
    const r = validateClaims("May help support skin health.", profile);
    expect(r.pass).toBe(true);
  });
});

describe("validateCadence", () => {
  it("warns when sentences out of range", () => {
    const short = "Hi. Ok. Yes. No. Go.";
    const r = validateCadence(short, profile);
    expect(r.issues.some((i) => i.rule === "cadence_sentence")).toBe(true);
  });
});

describe("validateFormatting", () => {
  it("fails when emoji used and policy is none", () => {
    const r = validateFormatting("Check this out! ✨", profile);
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "emoji_policy")).toBe(true);
  });
});

describe("validateVoiceOutput", () => {
  it("aggregates issues and computes score", () => {
    const r = validateVoiceOutput({
      text: "This product guarantees a miracle cure!",
      profile,
    });
    expect(r.pass).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(100);
  });

  it("passes on compliant text", () => {
    const text = [
      "Balance and clarity define this formula and its gentle approach to skincare.",
      "It may help support your skin over time with consistent use and care.",
      "Designed to restore a calm, even tone without harsh ingredients or disruption.",
    ].join(" ");
    const r = validateVoiceOutput({ text, profile });
    expect(r.pass).toBe(true);
    expect(r.score).toBe(100);
  });
});
