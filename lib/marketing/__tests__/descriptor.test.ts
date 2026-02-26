import { describe, it, expect } from "vitest";
import { getMarketingDescriptor } from "../descriptor";

describe("getMarketingDescriptor", () => {
  it("returns descriptor for Stabiliora with default contrastDelta", () => {
    const d = getMarketingDescriptor("Stabiliora");
    expect(d.archetypeLabel).toBe("Stabiliora");
    expect(d.tagline).toBe("Restore balance. Stay coherent.");
    expect(d.hitPoints.length).toBeGreaterThanOrEqual(3);
    expect(d.hitPoints.length).toBeLessThanOrEqual(5);
    expect(d.ctaText).toBe("Restore balance");
    expect(d.ctaStyle).toBe("soft");
    expect(d.contrastDelta).toBe(0.15);
  });

  it("returns descriptor for Radiantis with custom contrastDelta", () => {
    const d = getMarketingDescriptor("Radiantis", { contrastDelta: 0.3 });
    expect(d.archetypeLabel).toBe("Radiantis");
    expect(d.tagline).toBe("Illuminate. Expand. Clarify.");
    expect(d.ctaStyle).toBe("premium");
    expect(d.contrastDelta).toBe(0.3);
  });

  it("clamps contrastDelta to 0–1", () => {
    expect(getMarketingDescriptor("Stabiliora", { contrastDelta: -0.5 }).contrastDelta).toBe(0);
    expect(getMarketingDescriptor("Stabiliora", { contrastDelta: 2 }).contrastDelta).toBe(1);
  });

  it("returns distinct descriptors for different archetypes", () => {
    const s = getMarketingDescriptor("Stabiliora");
    const i = getMarketingDescriptor("Ignispectrum");
    expect(s.tagline).not.toBe(i.tagline);
    expect(s.ctaStyle).not.toBe(i.ctaStyle);
  });

  it("unknown archetype returns NEUTRAL_FALLBACK descriptor", () => {
    const d = getMarketingDescriptor("UnknownArchetype");
    expect(d.archetypeLabel).toBe("Neutral");
    expect(d.tagline).toBe("Premium. Minimal. Refined.");
    expect(d.ctaText).toBe("Learn more");
    expect(d.ctaStyle).toBe("soft");
    expect(d.hitPoints.length).toBeGreaterThan(0);
  });
});
