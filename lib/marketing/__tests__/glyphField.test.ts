import { describe, it, expect } from "vitest";
import { buildGlyphFieldPrompt, getGlyphFieldNegative } from "../glyphField";

/**
 * Example generated prompts (for documentation).
 * Run: npm run test:run -- lib/marketing/__tests__/glyphField.test.ts
 */
export const EXAMPLE_GLYPH_FIELD_PROMPTS = {
  Stabiliora: () => buildGlyphFieldPrompt("Stabiliora"),
  Radiantis: () => buildGlyphFieldPrompt("Radiantis"),
  Tenebris: () => buildGlyphFieldPrompt("Tenebris"),
};

describe("buildGlyphFieldPrompt", () => {
  it("includes SECTION 1 with fixed glyph \"(L)\"", () => {
    const prompt = buildGlyphFieldPrompt("Stabiliora");
    expect(prompt).toContain('SECTION 1 — Core Glyph (fixed)');
    expect(prompt).toContain('exactly "(L)"');
    expect(prompt).toContain("capital letter L inside parentheses");
    expect(prompt).toContain("Preserve characters and topology");
    expect(prompt).toContain("High legibility");
    expect(prompt).toContain("Centered composition");
  });

  it("includes SECTION 2 with archetype field distortion", () => {
    const prompt = buildGlyphFieldPrompt("Stabiliora");
    expect(prompt).toContain("SECTION 2 — Archetype Field Distortion");
    expect(prompt).toContain("Maximum archetype influence");
    expect(prompt).toContain("color shifts");
    expect(prompt).toContain("material rendering");
  });

  it("Stabiliora: Deviation Budget LOW", () => {
    const prompt = buildGlyphFieldPrompt("Stabiliora");
    expect(prompt).toContain("Deviation Budget: LOW");
    expect(prompt).toContain("warm-neutral");
    expect(prompt).toContain("blush");
    expect(prompt).toContain("symmetrical flow lines");
  });

  it("Radiantis: Deviation Budget HIGH", () => {
    const prompt = buildGlyphFieldPrompt("Radiantis");
    expect(prompt).toContain("Deviation Budget: HIGH");
    expect(prompt).toContain("luminous");
    expect(prompt).toContain("light");
    expect(prompt).toContain("radiating");
  });

  it("Tenebris: Deviation Budget LOW", () => {
    const prompt = buildGlyphFieldPrompt("Tenebris");
    expect(prompt).toContain("Deviation Budget: LOW");
    expect(prompt).toContain("shadow");
    expect(prompt).toContain("chiaroscuro");
    expect(prompt).toContain("contemplative");
  });

  it("unknown archetype uses NEUTRAL_FALLBACK", () => {
    const prompt = buildGlyphFieldPrompt("UnknownArchetype");
    expect(prompt).toContain("Deviation Budget: LOW");
    expect(prompt).toContain("neutral");
    expect(prompt).toContain("premium");
  });

  it("contrastDelta affects clarity/energy", () => {
    const low = buildGlyphFieldPrompt("Stabiliora", 0.1);
    const high = buildGlyphFieldPrompt("Stabiliora", 0.6);
    expect(low).not.toContain("slightly increased clarity");
    expect(high).toContain("slightly increased clarity");
    expect(high).toContain("subtle energy lift");
  });

  it("includes hard constraints", () => {
    const prompt = buildGlyphFieldPrompt("Stabiliora");
    expect(prompt).toContain("no extra text beyond the glyph");
    expect(prompt).toContain("no zodiac symbols");
    expect(prompt).toContain("no corporate badge shapes");
    expect(prompt).toContain("no creatures, wings, fantasy");
    expect(prompt).toContain("premium, minimal, high-end");
  });

  it("getGlyphFieldNegative returns constraint string", () => {
    const neg = getGlyphFieldNegative();
    expect(neg).toContain("zodiac");
    expect(neg).toContain("corporate badge");
    expect(neg).toContain("creatures");
    expect(neg).toContain("wings");
  });

  it("example outputs match documented structure (Stabiliora, Radiantis, Tenebris)", () => {
    const s = buildGlyphFieldPrompt("Stabiliora");
    const r = buildGlyphFieldPrompt("Radiantis");
    const t = buildGlyphFieldPrompt("Tenebris");

    for (const [name, p] of [
      ["Stabiliora", s],
      ["Radiantis", r],
      ["Tenebris", t],
    ] as const) {
      expect(p.split("\n\n")).toHaveLength(2);
      expect(p).toMatch(/SECTION 1[\s\S]*SECTION 2/);
      if (process.env.DUMP_GLYPH_EXAMPLES) {
        console.log(`\n=== ${name} ===\n${p}\n`);
      }
    }
  });
});
