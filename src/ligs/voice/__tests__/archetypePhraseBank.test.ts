/**
 * Tests for archetype phrase bank.
 */

import { describe, it, expect } from "vitest";
import {
  getArchetypePhraseBank,
  buildPhraseBankBlock,
  LIGS_ARCHETYPES,
} from "../archetypePhraseBank";

const CATEGORIES = [
  "sensoryMetaphors",
  "behavioralTells",
  "relationalTells",
  "shadowDrift",
  "resetMoves",
] as const;

describe("archetypePhraseBank", () => {
  it("has phrase bank for all 12 archetypes", () => {
    expect(LIGS_ARCHETYPES).toHaveLength(12);
    for (const arch of LIGS_ARCHETYPES) {
      const bank = getArchetypePhraseBank(arch);
      expect(bank, `${arch} should have phrase bank`).toBeDefined();
    }
  });

  it("all categories are non-empty for every archetype", () => {
    for (const arch of LIGS_ARCHETYPES) {
      const bank = getArchetypePhraseBank(arch);
      for (const cat of CATEGORIES) {
        const arr = bank[cat];
        expect(Array.isArray(arr), `${arch}.${cat}`).toBe(true);
        expect(arr.length, `${arch}.${cat} length`).toBeGreaterThan(0);
      }
    }
  });

  it("sensoryMetaphors has exactly 5 per archetype", () => {
    for (const arch of LIGS_ARCHETYPES) {
      const bank = getArchetypePhraseBank(arch);
      expect(bank.sensoryMetaphors).toHaveLength(5);
    }
  });

  it("behavioralTells has exactly 5 per archetype", () => {
    for (const arch of LIGS_ARCHETYPES) {
      const bank = getArchetypePhraseBank(arch);
      expect(bank.behavioralTells).toHaveLength(5);
    }
  });

  it("relationalTells has exactly 5 per archetype", () => {
    for (const arch of LIGS_ARCHETYPES) {
      const bank = getArchetypePhraseBank(arch);
      expect(bank.relationalTells).toHaveLength(5);
    }
  });

  it("shadowDrift has exactly 3 per archetype", () => {
    for (const arch of LIGS_ARCHETYPES) {
      const bank = getArchetypePhraseBank(arch);
      expect(bank.shadowDrift).toHaveLength(3);
    }
  });

  it("resetMoves has exactly 3 per archetype", () => {
    for (const arch of LIGS_ARCHETYPES) {
      const bank = getArchetypePhraseBank(arch);
      expect(bank.resetMoves).toHaveLength(3);
    }
  });

  it("buildPhraseBankBlock returns formatted string with all categories", () => {
    const block = buildPhraseBankBlock("Stabiliora");
    expect(block).toContain("Stabiliora");
    expect(block).toContain("sensoryMetaphors");
    expect(block).toContain("behavioralTells");
    expect(block).toContain("relationalTells");
    expect(block).toContain("shadowDrift");
    expect(block).toContain("resetMoves");
    expect(block).toContain("phrase atoms");
  });
});
