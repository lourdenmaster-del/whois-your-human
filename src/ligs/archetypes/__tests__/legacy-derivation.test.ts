/**
 * Ensures legacy archetype maps derive from the canonical contract.
 * If these tests fail, the legacy files have drifted from the contract.
 */
import { describe, it, expect } from "vitest";
import { ARCHETYPE_VISUAL_MAP } from "../../image/archetype-visual-map";
import { ARCHETYPE_ANCHORS } from "../../voice/prompt/archetypeAnchors";
import { ARCHETYPE_COPY_PHRASES } from "../../marketing/archetype-copy-map";
import {
  getVisualMapRecord,
  getVoiceAnchorRecord,
  getOverlayCopyRecord,
} from "../adapters";
import { LIGS_ARCHETYPES } from "../contract";

describe("Legacy maps derive from contract", () => {
  it("ARCHETYPE_VISUAL_MAP equals getVisualMapRecord for all 12 archetypes", () => {
    const derived = getVisualMapRecord();
    expect(Object.keys(ARCHETYPE_VISUAL_MAP)).toHaveLength(12);
    expect(Object.keys(derived)).toHaveLength(12);
    for (const arch of LIGS_ARCHETYPES) {
      expect(ARCHETYPE_VISUAL_MAP[arch]).toEqual(derived[arch]);
    }
  });

  it("ARCHETYPE_VISUAL_MAP.Stabiliora deep equals contract-derived", () => {
    const derived = getVisualMapRecord();
    expect(ARCHETYPE_VISUAL_MAP.Stabiliora).toEqual(derived.Stabiliora);
    expect(ARCHETYPE_VISUAL_MAP.Stabiliora.mood).toBe("calm, regulated, coherent");
    expect(ARCHETYPE_VISUAL_MAP.Stabiliora.palette).toEqual([
      "warm-neutral",
      "soft earth tones",
      "muted",
      "soft neutrals",
    ]);
  });

  it("ARCHETYPE_ANCHORS equals getVoiceAnchorRecord for all 12 archetypes", () => {
    const derived = getVoiceAnchorRecord();
    expect(Object.keys(ARCHETYPE_ANCHORS)).toHaveLength(12);
    expect(Object.keys(derived)).toHaveLength(12);
    for (const arch of LIGS_ARCHETYPES) {
      expect(ARCHETYPE_ANCHORS[arch]).toEqual(derived[arch]);
    }
  });

  it("ARCHETYPE_ANCHORS.Stabiliora deep equals contract-derived", () => {
    const derived = getVoiceAnchorRecord();
    expect(ARCHETYPE_ANCHORS.Stabiliora).toEqual(derived.Stabiliora);
    expect(ARCHETYPE_ANCHORS.Stabiliora.emotional_temperature).toBe("low");
    expect(ARCHETYPE_ANCHORS.Stabiliora.lexicon_bias).toContain("balance");
  });

  it("ARCHETYPE_COPY_PHRASES equals getOverlayCopyRecord for all 12 archetypes", () => {
    const derived = getOverlayCopyRecord();
    expect(Object.keys(ARCHETYPE_COPY_PHRASES)).toHaveLength(12);
    expect(Object.keys(derived)).toHaveLength(12);
    for (const arch of LIGS_ARCHETYPES) {
      expect(ARCHETYPE_COPY_PHRASES[arch]).toEqual(derived[arch]);
    }
  });

  it("ARCHETYPE_COPY_PHRASES.Stabiliora deep equals contract-derived", () => {
    const derived = getOverlayCopyRecord();
    expect(ARCHETYPE_COPY_PHRASES.Stabiliora).toEqual(derived.Stabiliora);
    expect(ARCHETYPE_COPY_PHRASES.Stabiliora.headlines).toContain("Find your balance");
    expect(ARCHETYPE_COPY_PHRASES.Stabiliora.ctas).toEqual(["Learn more", "Discover", "Explore"]);
  });
});
