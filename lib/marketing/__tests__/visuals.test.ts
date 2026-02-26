import { describe, it, expect } from "vitest";
import {
  buildLogoMarkPrompt,
  buildTriangulatedMarketingPrompt,
  getMarketingVisualsNegative,
} from "../visuals";

describe("buildLogoMarkPrompt", () => {
  it("includes no text constraint and Stabiliora keywords/palette", () => {
    const p = buildLogoMarkPrompt("Stabiliora", 0.15);
    expect(p).toContain("NO TEXT");
    expect(p).toContain("no letters");
    expect(p).toContain("no numbers");
    expect(p).toContain("balance");
    expect(p).toContain("coherence");
    expect(p).toContain("blush");
    expect(p).toContain("cream");
    expect(p).toContain("rosewater");
    expect(p).toContain("lavender");
    expect(p).toContain("symmetrical flow lines");
  });

  it("falls back safely for unknown archetype", () => {
    const p = buildLogoMarkPrompt("UnknownArchetype", 0.15);
    expect(p).toContain("NO TEXT");
    expect(p).toContain("premium");
    expect(p).toContain("minimal");
    expect(p).toContain("refined");
    expect(p).toContain("neutral");
  });
});

describe("buildTriangulatedMarketingPrompt", () => {
  it("includes full-width background and clean region for Stabiliora marketing_background", () => {
    const { positive } = buildTriangulatedMarketingPrompt(
      { primaryArchetype: "Stabiliora", seed: "test" },
      "marketing_background"
    );
    expect(positive).toMatch(/full-width|broad|negative space/i);
    expect(positive).toMatch(/Palette|Structure/);
  });

  it("produces valid output for share_card mode", () => {
    const { positive, negative } = buildTriangulatedMarketingPrompt(
      { primaryArchetype: "Radiantis", secondaryArchetype: "Tenebris", seed: "share-test" },
      "share_card"
    );
    expect(positive).toMatch(/full-width|top band|framed|negative space/i);
    expect(negative).toContain("text");
  });

  it("produces valid output for marketing_logo_mark mode (triangulated)", () => {
    const { positive, negative } = buildTriangulatedMarketingPrompt(
      { primaryArchetype: "Stabiliora", seed: "logo-test" },
      "marketing_logo_mark"
    );
    expect(positive).toMatch(/Logo mark|symbol|focal|silhouette|favicon/i);
    expect(positive).toMatch(/Palette|Structure/);
    expect(negative).toContain("text");
  });
});

describe("getMarketingVisualsNegative", () => {
  it("includes astrology and text exclusions", () => {
    const n = getMarketingVisualsNegative();
    expect(n).toContain("astrology");
    expect(n).toContain("text");
    expect(n).toContain("logo");
  });
});
