import { describe, it, expect } from "vitest";
import {
  LIGS_ARCHETYPES,
  ARCHETYPE_CONTRACT_MAP,
  NEUTRAL_FALLBACK,
  getArchetypeContract,
  getArchetypeOrFallback,
} from "../contract";

describe("ArchetypeContract", () => {
  it("contains all 12 archetypes", () => {
    expect(LIGS_ARCHETYPES).toHaveLength(12);
    for (const arch of LIGS_ARCHETYPES) {
      expect(ARCHETYPE_CONTRACT_MAP[arch]).toBeDefined();
      expect(ARCHETYPE_CONTRACT_MAP[arch].voice).toBeDefined();
      expect(ARCHETYPE_CONTRACT_MAP[arch].visual).toBeDefined();
      expect(ARCHETYPE_CONTRACT_MAP[arch].marketingDescriptor).toBeDefined();
      expect(ARCHETYPE_CONTRACT_MAP[arch].marketingVisuals).toBeDefined();
      expect(ARCHETYPE_CONTRACT_MAP[arch].copyPhrases).toBeDefined();
    }
  });

  it("NEUTRAL_FALLBACK is a complete contract", () => {
    expect(NEUTRAL_FALLBACK.voice.emotional_temperature).toBe("medium");
    expect(NEUTRAL_FALLBACK.marketingDescriptor.archetypeLabel).toBe("Neutral");
    expect(NEUTRAL_FALLBACK.marketingVisuals.keywords).toContain("premium");
  });

  it("getArchetypeOrFallback returns contract for known archetype", () => {
    const c = getArchetypeOrFallback("Stabiliora");
    expect(c.marketingDescriptor.archetypeLabel).toBe("Stabiliora");
    expect(c.voice.lexicon_bias).toContain("balance");
  });

  it("getArchetypeOrFallback returns NEUTRAL_FALLBACK for unknown archetype", () => {
    const c = getArchetypeOrFallback("UnknownArchetype");
    expect(c.marketingDescriptor.archetypeLabel).toBe("Neutral");
    expect(c).toBe(NEUTRAL_FALLBACK);
  });

  it("getArchetypeOrFallback returns NEUTRAL_FALLBACK for empty string", () => {
    const c = getArchetypeOrFallback("");
    expect(c).toBe(NEUTRAL_FALLBACK);
  });

  it("getArchetypeContract returns correct contract for Stabiliora", () => {
    const c = getArchetypeContract("Stabiliora");
    expect(c.visual.palette).toContain("warm-neutral");
    expect(c.copyPhrases.headlines.length).toBeGreaterThan(0);
  });
});
