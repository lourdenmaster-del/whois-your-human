import { describe, it, expect } from "vitest";
import { ENGINE_SPEC } from "../engine-spec";

describe("ENGINE_SPEC prompt hardening", () => {
  it("includes Hard Constraints block with forbidden content terms", () => {
    expect(ENGINE_SPEC).toContain("HARD CONSTRAINTS");
    expect(ENGINE_SPEC).toContain("FORBIDDEN CONTENT");

    const forbiddenTerms = [
      "Chakras",
      "Sushumna",
      "Anahata",
      "Ajna",
      "Kabbalah",
      "sefirot",
      "Tree of Life",
      "Sacred geometry",
      "phi ratios",
      "axis mundi",
      "Alchemy",
      "salt",
      "sulfur",
      "mercury",
      "esoteric anatomy",
      "Schumann resonance",
      "Jupiterian",
      "Ancient traditions say",
      "Legends hold",
    ];

    for (const term of forbiddenTerms) {
      expect(ENGINE_SPEC, `ENGINE_SPEC should mention "${term}" in Hard Constraints`).toContain(term);
    }
  });

  it("includes style rules in Hard Constraints block", () => {
    expect(ENGINE_SPEC).toContain("STYLE RULES");
    expect(ENGINE_SPEC).toContain("factual, grounded language");
    expect(ENGINE_SPEC).toContain("max 1 per section");
    expect(ENGINE_SPEC).toContain("under 60 words");
    expect(ENGINE_SPEC).toContain("Birth Context");
    expect(ENGINE_SPEC).toContain("OnThisDay");
    expect(ENGINE_SPEC).toContain("context only");
    expect(ENGINE_SPEC).toContain("never use as causal explanation");
  });

  it("includes output validity rule", () => {
    expect(ENGINE_SPEC).toContain("OUTPUT VALIDITY");
    expect(ENGINE_SPEC).toContain("concrete numeric fact");
    expect(ENGINE_SPEC).toContain("sun");
    expect(ENGINE_SPEC).toContain("moon");
    expect(ENGINE_SPEC).toContain("onThisDay");
  });
});
