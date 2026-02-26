import { describe, it, expect } from "vitest";
import { buildArchetypeVisualVoiceSpec } from "../buildArchetypeVisualVoice";

describe("buildArchetypeVisualVoiceSpec", () => {
  it("returns under 20 lines for Stabiliora", () => {
    const block = buildArchetypeVisualVoiceSpec("Stabiliora", {
      mode: "variation",
      entropy: 0.2,
      seed: "test",
    });
    const lines = block.split("\n").filter(Boolean);
    expect(lines.length).toBeLessThanOrEqual(20);
  });

  it("returns under 20 lines for Ignispectrum", () => {
    const block = buildArchetypeVisualVoiceSpec("Ignispectrum", {
      mode: "signature",
      entropy: 0.6,
      seed: "test",
    });
    const lines = block.split("\n").filter(Boolean);
    expect(lines.length).toBeLessThanOrEqual(20);
  });

  it("includes temperature and structure directives", () => {
    const block = buildArchetypeVisualVoiceSpec("Stabiliora", {
      mode: "variation",
      entropy: 0.2,
      seed: "x",
    });
    expect(block).toContain("Temperature:");
    expect(block).toContain("Structure:");
  });

  it("Stabiliora entropy 0.2 has muted/soft visual cues", () => {
    const block = buildArchetypeVisualVoiceSpec("Stabiliora", {
      mode: "variation",
      entropy: 0.2,
      seed: "stable",
    });
    expect(block.toLowerCase()).toMatch(/muted|soft|diffused|calm/);
  });

  it("Ignispectrum entropy 0.6 has vibrant/bold visual cues", () => {
    const block = buildArchetypeVisualVoiceSpec("Ignispectrum", {
      mode: "signature",
      entropy: 0.6,
      seed: "ignite",
    });
    expect(block.toLowerCase()).toMatch(/vibrant|bold|warm|intensity/);
  });

  it("produces deterministic output for same archetype and seed", () => {
    const a = buildArchetypeVisualVoiceSpec("Stabiliora", {
      mode: "variation",
      entropy: 0.2,
      seed: "same",
    });
    const b = buildArchetypeVisualVoiceSpec("Stabiliora", {
      mode: "variation",
      entropy: 0.2,
      seed: "same",
    });
    expect(a).toBe(b);
  });

  it("different seeds produce different variable atoms", () => {
    const a = buildArchetypeVisualVoiceSpec("Stabiliora", {
      mode: "variation",
      entropy: 0.6,
      seed: "seed-a",
    });
    const b = buildArchetypeVisualVoiceSpec("Stabiliora", {
      mode: "variation",
      entropy: 0.6,
      seed: "seed-b",
    });
    expect(a).not.toBe(b);
  });

  it("exemplar mode excludes behavioral/relational field", () => {
    const block = buildArchetypeVisualVoiceSpec("Stabiliora", {
      mode: "exemplar",
      entropy: 0.8,
      seed: "exemplar",
    });
    expect(block).not.toContain("Field:");
  });
});
