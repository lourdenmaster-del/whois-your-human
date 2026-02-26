import { describe, it, expect } from "vitest";
import {
  getArchetypeVisualMapShape,
  getArchetypeVoiceAnchorShape,
  getMarketingDescriptor,
  getOverlayCopyBank,
  getMarketingVisuals,
  getVisualMapRecord,
  getVisualParamsOrFallback,
} from "../adapters";

describe("Archetype adapters", () => {
  it("getArchetypeVisualMapShape returns stable shape for Stabiliora", () => {
    const v = getArchetypeVisualMapShape("Stabiliora");
    expect(v.mood).toBe("calm, regulated, coherent");
    expect(v.palette).toEqual([
      "warm-neutral",
      "soft earth tones",
      "muted",
      "soft neutrals",
    ]);
    expect(v.flow_lines).toBe("subtle");
    expect(v.texture_level).toBe("low");
    expect(v.contrast_level).toBe("low");
  });

  it("getArchetypeVisualMapShape returns NEUTRAL_FALLBACK shape for unknown", () => {
    const v = getArchetypeVisualMapShape("UnknownArchetype");
    expect(v.mood).toBe("premium, minimal, refined");
    expect(v.palette).toContain("neutral");
  });

  it("getArchetypeVoiceAnchorShape returns stable shape for Stabiliora", () => {
    const a = getArchetypeVoiceAnchorShape("Stabiliora");
    expect(a.emotional_temperature).toBe("low");
    expect(a.lexicon_bias).toContain("balance");
    expect(a.structure_preference).toBe("declarative");
  });

  it("getArchetypeVoiceAnchorShape returns NEUTRAL_FALLBACK shape for unknown", () => {
    const a = getArchetypeVoiceAnchorShape("Unknown");
    expect(a.emotional_temperature).toBe("medium");
    expect(a.lexicon_bias).toContain("premium");
  });

  it("getMarketingDescriptor returns stable shape for Stabiliora", () => {
    const d = getMarketingDescriptor("Stabiliora");
    expect(d.archetypeLabel).toBe("Stabiliora");
    expect(d.tagline).toBe("Restore balance. Stay coherent.");
    expect(d.ctaText).toBe("Restore balance");
    expect(d.ctaStyle).toBe("soft");
    expect(d.hitPoints.length).toBe(4);
  });

  it("getMarketingDescriptor returns NEUTRAL_FALLBACK shape for unknown", () => {
    const d = getMarketingDescriptor("UnknownX");
    expect(d.archetypeLabel).toBe("Neutral");
    expect(d.ctaStyle).toBe("soft");
  });

  it("getOverlayCopyBank returns stable shape for Stabiliora", () => {
    const bank = getOverlayCopyBank("Stabiliora");
    expect(bank.headlines.length).toBeGreaterThan(0);
    expect(bank.subheads.length).toBeGreaterThan(0);
    expect(bank.ctas.length).toBeGreaterThan(0);
    expect(bank.disclaimers.length).toBeGreaterThan(0);
    expect(bank.headlines).toContain("Find your balance");
  });

  it("getOverlayCopyBank returns NEUTRAL_FALLBACK shape for unknown", () => {
    const bank = getOverlayCopyBank("Unknown");
    expect(bank.headlines).toContain("Premium clarity");
    expect(bank.ctas).toContain("Learn more");
  });

  it("getMarketingVisuals returns stable shape for Stabiliora", () => {
    const mv = getMarketingVisuals("Stabiliora");
    expect(mv.keywords).toEqual(["balance", "coherence", "regulation"]);
    expect(mv.palette).toEqual(["blush", "cream", "rosewater", "lavender"]);
    expect(mv.motion).toBe("symmetrical flow lines");
  });

  it("getMarketingVisuals returns NEUTRAL_FALLBACK for unknown", () => {
    const mv = getMarketingVisuals("Unknown");
    expect(mv.keywords).toContain("premium");
    expect(mv.palette).toContain("neutral");
  });

  it("getVisualParamsOrFallback returns NEUTRAL_FALLBACK.visual for unknown archetype", () => {
    const v = getVisualParamsOrFallback("UnknownArchetype");
    expect(v.mood).toBe("premium, minimal, refined");
    expect(v.palette).toContain("neutral");
    expect(v.flow_lines).toBe("subtle");
  });

  it("getVisualParamsOrFallback returns NEUTRAL_FALLBACK.visual for null/undefined/empty", () => {
    expect(getVisualParamsOrFallback(null).mood).toBe("premium, minimal, refined");
    expect(getVisualParamsOrFallback(undefined).mood).toBe("premium, minimal, refined");
    expect(getVisualParamsOrFallback("").mood).toBe("premium, minimal, refined");
  });

  it("getVisualMapRecord returns full map with all 12 archetypes", () => {
    const map = getVisualMapRecord();
    expect(Object.keys(map)).toHaveLength(12);
    expect(map.Stabiliora.mood).toBe("calm, regulated, coherent");
    expect(map.Ignispectrum.mood).toBe("energetic, vivid, transformative");
  });
});
