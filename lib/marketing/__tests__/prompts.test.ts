import { describe, it, expect } from "vitest";
import { buildMarketingImagePrompts } from "../prompts";

describe("buildMarketingImagePrompts", () => {
  it("returns logoMark and marketingBackground for Stabiliora", () => {
    const p = buildMarketingImagePrompts("Stabiliora");
    expect(p.logoMark.positive).toContain("Abstract premium symbol");
    expect(p.logoMark.positive).toContain("no text");
    expect(p.logoMark.negative).toContain("text");
    expect(p.logoMark.negative).toContain("astrology");
    expect(p.marketingBackground.positive).toContain("Abstract premium background");
    expect(p.marketingBackground.positive).toContain("calm");
  });

  it("returns distinct prompts for Ignispectrum", () => {
    const p = buildMarketingImagePrompts("Ignispectrum");
    expect(p.logoMark.positive).toContain("energetic");
    expect(p.marketingBackground.positive).toContain("energetic");
  });

  it("applies contrastDelta for clarity/energy when elevated", () => {
    const mid = buildMarketingImagePrompts("Stabiliora", { contrastDelta: 0.4 });
    const high = buildMarketingImagePrompts("Stabiliora", { contrastDelta: 0.6 });
    expect(mid.logoMark.positive).toContain("clarity");
    expect(high.logoMark.positive).toContain("energy");
  });
});
