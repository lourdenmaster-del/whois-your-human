import { describe, it, expect } from "vitest";
import { scanForbidden, redactForbidden, FORBIDDEN_PATTERNS } from "../constraintGate";

describe("scanForbidden", () => {
  it("returns empty array for clean text", () => {
    expect(scanForbidden("Light vectors and spectral gradients form the identity field.")).toEqual([]);
    expect(scanForbidden("")).toEqual([]);
  });

  it("detects chakra", () => {
    expect(scanForbidden("The chakra system aligns with cosmic flux.")).toContain("chakra");
    expect(scanForbidden("Chakras and energy centers")).toContain("chakra");
  });

  it("detects multiple forbidden terms and dedupes", () => {
    const text = "The anahata chakra connects to kabbalah and sacred geometry.";
    const hits = scanForbidden(text);
    expect(hits).toContain("chakra");
    expect(hits).toContain("anahata");
    expect(hits).toContain("kabbalah");
    expect(hits).toContain("sacred geometry");
    expect(hits).toHaveLength(new Set(hits).size);
  });

  it("detects schumann, venusian, saturnine", () => {
    expect(scanForbidden("Schumann resonance")).toContain("schumann");
    expect(scanForbidden("Venusian influence")).toContain("venusian");
    expect(scanForbidden("Saturnine discipline")).toContain("saturnine");
  });

  it("detects ancient traditions and legends hold", () => {
    expect(scanForbidden("Ancient traditions say this.")).toContain("ancient traditions");
    expect(scanForbidden("Legends hold that the stars")).toContain("legends hold");
  });

  it("detects as above so below", () => {
    expect(scanForbidden("As above so below, the cosmos mirrors")).toContain("as above so below");
  });

  it("returns empty for null or non-string", () => {
    expect(scanForbidden(null as unknown as string)).toEqual([]);
    expect(scanForbidden(undefined as unknown as string)).toEqual([]);
  });
});

describe("redactForbidden", () => {
  it("returns text unchanged when keys empty", () => {
    const text = "The chakra opens.";
    expect(redactForbidden(text, [])).toBe(text);
  });

  it("replaces matched patterns with [removed]", () => {
    const text = "The chakra system and kabbalah inspire.";
    const result = redactForbidden(text, ["chakra", "kabbalah"]);
    expect(result).toContain("[removed]");
    expect(result).not.toContain("chakra");
    expect(result).not.toContain("kabbalah");
  });

  it("handles unknown keys gracefully", () => {
    const text = "Clean text.";
    expect(redactForbidden(text, ["nonexistent"])).toBe(text);
  });
});

describe("FORBIDDEN_PATTERNS", () => {
  it("includes expected pattern keys", () => {
    const keys = FORBIDDEN_PATTERNS.map((p) => p.key);
    expect(keys).toContain("chakra");
    expect(keys).toContain("kabbalah");
    expect(keys).toContain("sacred geometry");
    expect(keys).toContain("schumann");
  });
});
