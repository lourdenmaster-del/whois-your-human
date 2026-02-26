import { describe, it, expect } from "vitest";
import {
  getPrimaryArchetypeFromSolarLongitude,
  resolveSecondaryArchetype,
  buildTriangulatedImagePrompt,
  buildProviderPromptString,
} from "../triangulatePrompt";

describe("triangulatePrompt", () => {
  it("getPrimaryArchetypeFromSolarLongitude maps 0° to Ignispectrum", () => {
    expect(getPrimaryArchetypeFromSolarLongitude(0)).toBe("Ignispectrum");
    expect(getPrimaryArchetypeFromSolarLongitude(15)).toBe("Ignispectrum");
  });

  it("getPrimaryArchetypeFromSolarLongitude maps 30° to Stabiliora", () => {
    expect(getPrimaryArchetypeFromSolarLongitude(30)).toBe("Stabiliora");
  });

  it("getPrimaryArchetypeFromSolarLongitude maps 120° to Radiantis", () => {
    expect(getPrimaryArchetypeFromSolarLongitude(120)).toBe("Radiantis");
  });

  it("resolveSecondaryArchetype returns next when same as primary", () => {
    expect(resolveSecondaryArchetype("Stabiliora", "Stabiliora")).toBe("Duplicaris");
  });

  it("resolveSecondaryArchetype returns Vectoris for Ignispectrum (reinforce ignition)", () => {
    expect(resolveSecondaryArchetype("Ignispectrum", "Ignispectrum")).toBe("Vectoris");
  });

  it("resolveSecondaryArchetype returns secondary when different", () => {
    expect(resolveSecondaryArchetype("Tenebris", "Radiantis")).toBe("Tenebris");
  });

  it("buildTriangulatedImagePrompt returns positive and negative", () => {
    const out = buildTriangulatedImagePrompt({
      primaryArchetype: "Radiantis",
      secondaryArchetype: "Tenebris",
      solarProfile: { sunLonDeg: 120, twilightPhase: "nautical" },
      twilightPhase: "nautical",
      mode: "signature",
      seed: "test",
    });
    expect(out.positive.length).toBeGreaterThan(0);
    expect(out.negative).toContain("text");
    expect(out.negative).toContain("face");
  });

  it("example output Radiantis + Tenebris twilight nautical", () => {
    const out = buildTriangulatedImagePrompt({
      primaryArchetype: "Radiantis",
      secondaryArchetype: "Tenebris",
      solarProfile: { sunLonDeg: 120, twilightPhase: "nautical" },
      twilightPhase: "nautical",
      mode: "signature",
      seed: "report-example",
      basePrompt: "E.V.E. imagery: light field, spectral gradient.",
    });
    expect(out.positive).toMatch(/PRIMARY|Palette/);
    expect(out.positive.toLowerCase()).toMatch(/luminous|radiant|nautical|abstraction/);
  });

  it("example prompts for docs: variation, marketing_background, share_card (Radiantis+Tenebris, nautical)", () => {
    const identity = {
      primaryArchetype: "Radiantis" as const,
      secondaryArchetype: "Tenebris" as const,
      solarProfile: { sunLonDeg: 120, twilightPhase: "nautical" as const },
      twilightPhase: "nautical" as const,
      seed: "doc-example",
    };
    const variation = buildTriangulatedImagePrompt({
      ...identity,
      mode: "variation",
      basePrompt: "Abstract premium background. luminous, warm gold, soft gradients.",
    });
    const marketingBg = buildTriangulatedImagePrompt({ ...identity, mode: "marketing_background" });
    const shareCard = buildTriangulatedImagePrompt({ ...identity, mode: "share_card" });
    expect(variation.positive.length).toBeGreaterThan(0);
    expect(marketingBg.positive).toMatch(/full-width|broad|negative space/);
    expect(shareCard.positive).toMatch(/full-width|top band|framed/);
    if (process.env.PRINT_EXAMPLE_PROMPTS) {
      console.log("\n=== 1. VARIATION ===\n", variation.positive);
      console.log("\nNEGATIVE:", variation.negative);
      console.log("\nPROVIDER STRING:", buildProviderPromptString(variation.positive, variation.negative));
      console.log("\n=== 2. MARKETING_BACKGROUND ===\n", marketingBg.positive);
      console.log("\nNEGATIVE:", marketingBg.negative);
      console.log("\nPROVIDER STRING:", buildProviderPromptString(marketingBg.positive, marketingBg.negative));
      console.log("\n=== 3. SHARE_CARD ===\n", shareCard.positive);
      console.log("\nNEGATIVE:", shareCard.negative);
      console.log("\nPROVIDER STRING:", buildProviderPromptString(shareCard.positive, shareCard.negative));
    }
  });

  it("example output Stabiliora + Fluxionis twilight day", () => {
    const out = buildTriangulatedImagePrompt({
      primaryArchetype: "Stabiliora",
      secondaryArchetype: "Fluxionis",
      solarProfile: { sunLonDeg: 45, twilightPhase: "day" },
      twilightPhase: "day",
      mode: "variation",
      seed: "report-example",
    });
    expect(out.positive).toMatch(/Primary|Palette|Structure/);
    expect(out.positive.toLowerCase()).toMatch(/calm|regulated|day|luminance/);
  });
});
