/**
 * Local test harness for the E.V.E. filter.
 * Uses mock data only — does NOT call /api/engine or /api/report.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import {
  buildBeautyProfile,
  buildCondensedFullReport,
  extractArchetypeFromReport,
  buildArchetypeVoiceBlock,
} from "../lib/eve-spec";
import type { BeautyProfile, ThreeVoice } from "../lib/eve-spec";

const MOCK_PATH = join(process.cwd(), "tests", "mocks", "full_report.json");

function loadMock(): {
  full_report: string;
  emotional_snippet: string;
  vector_zero: import("../lib/vector-zero").VectorZero;
  filter_output: Record<string, unknown>;
} {
  const raw = readFileSync(MOCK_PATH, "utf-8");
  return JSON.parse(raw) as ReturnType<typeof loadMock>;
}

function hasThreeVoice(obj: unknown): obj is ThreeVoice {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.raw_signal === "string" &&
    typeof o.custodian === "string" &&
    typeof o.oracle === "string"
  );
}

describe("E.V.E. filter (local harness)", () => {
  it("extractArchetypeFromReport finds Radiantis in fixture", () => {
    const mock = loadMock();
    const arch = extractArchetypeFromReport(mock.full_report);
    expect(arch).toBe("Radiantis");
  });

  it("buildArchetypeVoiceBlock returns voice params for Radiantis", () => {
    const block = buildArchetypeVoiceBlock("Radiantis");
    expect(block).toContain("emotional_temperature");
    expect(block).toContain("rhythm");
    expect(block).toContain("lexicon_bias");
  });

  it("loads mock report and runs filter without calling API", () => {
    const mock = loadMock();
    expect(mock.full_report).toBeDefined();
    expect(mock.vector_zero).toBeDefined();
    expect(mock.filter_output).toBeDefined();
  });

  it("buildBeautyProfile produces valid Beauty Profile from mock filter output", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);

    // Log result for inspection
    console.log(JSON.stringify(profile, null, 2));

    // Only beauty fields are present
    expect(profile).toHaveProperty("vector_zero");
    expect(profile).toHaveProperty("light_signature");
    expect(profile).toHaveProperty("archetype");
    expect(profile).toHaveProperty("deviations");
    expect(profile).toHaveProperty("corrective_vector");
    expect(profile).toHaveProperty("imagery_prompts");
    const keys = Object.keys(profile);
    expect(keys).toHaveLength(6);
    expect(keys).toEqual([
      "vector_zero",
      "light_signature",
      "archetype",
      "deviations",
      "corrective_vector",
      "imagery_prompts",
    ]);

    // Each section has raw_signal, custodian, oracle
    const sections: (keyof BeautyProfile)[] = [
      "light_signature",
      "archetype",
      "deviations",
      "corrective_vector",
    ];
    for (const key of sections) {
      const section = profile[key];
      expect(hasThreeVoice(section), `${key} should be ThreeVoice`).toBe(true);
      if (hasThreeVoice(section)) {
        expect(section.raw_signal).toBeDefined();
        expect(section.custodian).toBeDefined();
        expect(section.oracle).toBeDefined();
      }
    }

    expect(hasThreeVoice(profile.vector_zero.three_voice)).toBe(true);

    // imagery_prompts contains 3 strings
    expect(profile.imagery_prompts).toHaveProperty("vector_zero_beauty_field");
    expect(profile.imagery_prompts).toHaveProperty(
      "light_signature_aesthetic_field"
    );
    expect(profile.imagery_prompts).toHaveProperty("final_beauty_field");
    expect(typeof profile.imagery_prompts.vector_zero_beauty_field).toBe(
      "string"
    );
    expect(typeof profile.imagery_prompts.light_signature_aesthetic_field).toBe(
      "string"
    );
    expect(typeof profile.imagery_prompts.final_beauty_field).toBe("string");

    // vector_zero.beauty_baseline exists
    expect(profile.vector_zero).toHaveProperty("beauty_baseline");
    expect(profile.vector_zero.beauty_baseline).toHaveProperty("color_family");
    expect(profile.vector_zero.beauty_baseline).toHaveProperty("texture_bias");
    expect(profile.vector_zero.beauty_baseline).toHaveProperty("shape_bias");
    expect(profile.vector_zero.beauty_baseline).toHaveProperty("motion_bias");
  });

  it("E.V.E. output populates all five three-voice sections (non-empty)", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);

    const threeVoiceSections: (keyof BeautyProfile)[] = [
      "light_signature",
      "archetype",
      "deviations",
      "corrective_vector",
    ];
    for (const key of threeVoiceSections) {
      const section = profile[key];
      expect(hasThreeVoice(section), `${key} should be ThreeVoice`).toBe(true);
      if (hasThreeVoice(section)) {
        expect(section.raw_signal.length, `${key}.raw_signal non-empty`).toBeGreaterThan(0);
        expect(section.custodian.length, `${key}.custodian non-empty`).toBeGreaterThan(0);
        expect(section.oracle.length, `${key}.oracle non-empty`).toBeGreaterThan(0);
      }
    }

    expect(hasThreeVoice(profile.vector_zero.three_voice)).toBe(true);
    expect(profile.vector_zero.three_voice.raw_signal.length).toBeGreaterThan(0);
  });

  it("imagery_prompts are non-empty", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);

    expect(profile.imagery_prompts.vector_zero_beauty_field.length).toBeGreaterThan(0);
    expect(profile.imagery_prompts.light_signature_aesthetic_field.length).toBeGreaterThan(0);
    expect(profile.imagery_prompts.final_beauty_field.length).toBeGreaterThan(0);
  });

  it("archetype, deviations, corrective_vector are no longer empty (structured extraction)", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);

    expect(profile.archetype.raw_signal).not.toEqual("");
    expect(profile.archetype.custodian).not.toEqual("");
    expect(profile.archetype.oracle).not.toEqual("");

    expect(profile.deviations.raw_signal).not.toEqual("");
    expect(profile.deviations.custodian).not.toEqual("");
    expect(profile.deviations.oracle).not.toEqual("");

    expect(profile.corrective_vector.raw_signal).not.toEqual("");
    expect(profile.corrective_vector.custodian).not.toEqual("");
    expect(profile.corrective_vector.oracle).not.toEqual("");
  });

  it("buildCondensedFullReport produces user-facing report with all four sections", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);
    const archetypeName = extractArchetypeFromReport(mock.full_report);
    const condensed = buildCondensedFullReport(profile, {
      archetypeName: archetypeName ?? "Radiantis",
      useElegantLabels: true,
    });

    expect(condensed).toContain("Light Signature");
    expect(condensed).toContain("Archetype");
    expect(condensed).toContain("Deviations");
    expect(condensed).toContain("Corrective Vector");
    expect(condensed).toContain("Signal:");
    expect(condensed).toContain("Ground:");
    expect(condensed).toContain("Reflection:");
    expect(condensed.length).toBeGreaterThan(100);
  });

  it("buildCondensedFullReport includes four bridge lines", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);
    const condensed = buildCondensedFullReport(profile, {
      archetypeName: "Radiantis",
      useElegantLabels: true,
    });

    expect(condensed).toContain("How you shine when you're aligned.");
    expect(condensed).toContain("Your core pattern and how it presents.");
    expect(condensed).toContain("Where the pattern drifts under pressure.");
    expect(condensed).toContain("How you return to center.");
  });

  it("buildCondensedFullReport includes Key Moves with three bullets", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);
    const condensed = buildCondensedFullReport(profile, {
      archetypeName: "Radiantis",
      useElegantLabels: true,
    });

    expect(condensed).toContain("Key Moves");
    const bulletCount = (condensed.match(/•/g) ?? []).length;
    expect(bulletCount, "Key Moves should have three bullets").toBe(3);
  });

  it("buildCondensedFullReport still contains each section voice content", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);
    const condensed = buildCondensedFullReport(profile, {
      archetypeName: "Radiantis",
      useElegantLabels: true,
    });

    expect(condensed).toContain(profile.light_signature.raw_signal);
    expect(condensed).toContain(profile.light_signature.custodian);
    expect(condensed).toContain(profile.light_signature.oracle);
    expect(condensed).toContain(profile.archetype.raw_signal);
    expect(condensed).toContain(profile.deviations.raw_signal);
    expect(condensed).toContain(profile.corrective_vector.raw_signal);
  });

  const FORBIDDEN_WORDS = ["organism", "retinal", "vestibular", "axial centers", "encodes this flux", "biological expression follows"];

  it("emotionalSnippet contains second-person 'you'", () => {
    const mock = loadMock();
    expect(mock.emotional_snippet.toLowerCase()).toContain("you");
  });

  it("custodian and oracle contain second-person 'you'", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);

    const sections: Array<{ key: string; v: ThreeVoice }> = [
      { key: "vector_zero.three_voice", v: profile.vector_zero.three_voice },
      { key: "light_signature", v: profile.light_signature },
      { key: "archetype", v: profile.archetype },
      { key: "deviations", v: profile.deviations },
      { key: "corrective_vector", v: profile.corrective_vector },
    ];
    for (const { key, v } of sections) {
      expect(v.custodian.toLowerCase(), `${key}.custodian`).toContain("you");
      expect(v.oracle.toLowerCase(), `${key}.oracle`).toContain("you");
    }
  });

  it("fullReport does not contain forbidden words", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);
    const condensed = buildCondensedFullReport(profile, {
      archetypeName: "Radiantis",
    });
    const lower = condensed.toLowerCase();

    for (const word of FORBIDDEN_WORDS) {
      expect(lower, `fullReport should not contain "${word}"`).not.toContain(word);
    }
  });

  it("RAW SIGNAL does not contain 'you'", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);

    const sections: Array<{ key: string; v: ThreeVoice }> = [
      { key: "vector_zero.three_voice", v: profile.vector_zero.three_voice },
      { key: "light_signature", v: profile.light_signature },
      { key: "archetype", v: profile.archetype },
      { key: "deviations", v: profile.deviations },
      { key: "corrective_vector", v: profile.corrective_vector },
    ];
    for (const { key, v } of sections) {
      expect(v.raw_signal.toLowerCase(), `${key}.raw_signal`).not.toContain("you");
    }
  });

  it("CUSTODIAN contains 'In practice' and 'You tend to' (or 'You tend to')", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);

    const sections: Array<{ key: string; v: ThreeVoice }> = [
      { key: "vector_zero.three_voice", v: profile.vector_zero.three_voice },
      { key: "light_signature", v: profile.light_signature },
      { key: "archetype", v: profile.archetype },
      { key: "deviations", v: profile.deviations },
      { key: "corrective_vector", v: profile.corrective_vector },
    ];
    for (const { key, v } of sections) {
      expect(v.custodian, `${key}.custodian`).toMatch(/In practice/i);
      expect(v.custodian, `${key}.custodian`).toMatch(/You tend to/i);
    }
  });

  it("ORACLE is 1–2 sentences", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);

    const sentenceEnd = /[.!?]+/g;
    const countSentences = (s: string) => {
      const matches = s.trim().match(sentenceEnd);
      return matches ? matches.length : (s.trim().length > 0 ? 1 : 0);
    };

    const sections: Array<{ key: string; v: ThreeVoice }> = [
      { key: "vector_zero.three_voice", v: profile.vector_zero.three_voice },
      { key: "light_signature", v: profile.light_signature },
      { key: "archetype", v: profile.archetype },
      { key: "deviations", v: profile.deviations },
      { key: "corrective_vector", v: profile.corrective_vector },
    ];
    for (const { key, v } of sections) {
      const count = countSentences(v.oracle);
      expect(count, `${key}.oracle sentence count`).toBeGreaterThanOrEqual(1);
      expect(count, `${key}.oracle sentence count`).toBeLessThanOrEqual(2);
    }
  });

  it("voices are distinct (raw_signal != custodian != oracle) per section", () => {
    const mock = loadMock();
    const profile = buildBeautyProfile(mock.filter_output, mock.vector_zero);

    const sections: Array<{ key: string; v: ThreeVoice }> = [
      { key: "vector_zero.three_voice", v: profile.vector_zero.three_voice },
      { key: "light_signature", v: profile.light_signature },
      { key: "archetype", v: profile.archetype },
      { key: "deviations", v: profile.deviations },
      { key: "corrective_vector", v: profile.corrective_vector },
    ];
    for (const { key, v } of sections) {
      expect(v.raw_signal, `${key}.raw_signal`).not.toEqual(v.custodian);
      expect(v.raw_signal, `${key}.raw_signal`).not.toEqual(v.oracle);
      expect(v.custodian, `${key}.custodian`).not.toEqual(v.oracle);
    }
  });
});
