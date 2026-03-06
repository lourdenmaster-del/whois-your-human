/**
 * Archetype Contract Validator tests.
 * Run: vitest run src/ligs/archetypes/__tests__/validateArchetypeContract.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  validateArchetype,
  validateAllArchetypes,
  allArchetypesValid,
} from "../validateArchetypeContract";

describe("validateArchetypeContract", () => {
  it("validates Ignispectrum successfully", () => {
    const result = validateArchetype("Ignispectrum");
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("validates all 12 archetypes", () => {
    const results = validateAllArchetypes();
    expect(results).toHaveLength(12);
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      const msg = failed.map((r) => `${r.archetype}: ${r.errors.join("; ")}`).join("\n");
      expect.fail(`Some archetypes failed validation:\n${msg}`);
    }
  });

  it("allArchetypesValid returns true when all pass", () => {
    expect(allArchetypesValid()).toBe(true);
  });
});
