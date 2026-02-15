/**
 * Local test harness for the E.V.E. filter.
 * Uses mock data only — does NOT call /api/engine or /api/report.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { buildBeautyProfile } from "../lib/eve-spec";
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
});
