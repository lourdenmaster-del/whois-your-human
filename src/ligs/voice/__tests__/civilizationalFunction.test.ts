/**
 * Tests for canonical civilizational function data.
 * Ensures all 12 system archetypes have entries and section format is correct.
 */

import { describe, it, expect } from "vitest";
import {
  CIVILIZATIONAL_FUNCTION_ARCHETYPES,
  getCivilizationalFunction,
  hasCivilizationalFunction,
} from "../civilizationalFunction";
import { composeCivilizationalFunctionSection } from "@/lib/report-composition";

describe("civilizationalFunction", () => {
  it("exposes exactly 12 archetypes", () => {
    expect(CIVILIZATIONAL_FUNCTION_ARCHETYPES).toHaveLength(12);
  });

  it("has a complete entry for every archetype", () => {
    for (const arch of CIVILIZATIONAL_FUNCTION_ARCHETYPES) {
      const entry = getCivilizationalFunction(arch);
      expect(entry.structuralFunction).toBeDefined();
      expect(entry.structuralFunction.length).toBeGreaterThan(10);
      expect(entry.contributionEnvironments.length).toBeGreaterThanOrEqual(4);
      expect(entry.frictionEnvironments.length).toBeGreaterThanOrEqual(3);
      expect(entry.civilizationalRole).toBeDefined();
      expect(entry.civilizationalRole.length).toBeGreaterThan(10);
      expect(entry.integrationInsight).toBeDefined();
      expect(entry.integrationInsight.length).toBeGreaterThan(10);
    }
  });

  it("hasCivilizationalFunction returns true for all 12", () => {
    for (const arch of CIVILIZATIONAL_FUNCTION_ARCHETYPES) {
      expect(hasCivilizationalFunction(arch)).toBe(true);
    }
  });

  it("composeCivilizationalFunctionSection for Structoris includes all subsections", () => {
    const section = composeCivilizationalFunctionSection({ dominantArchetype: "Structoris" });
    expect(section).toContain("Structural Function");
    expect(section).toContain("Contribution Environments");
    expect(section).toContain("Friction Environments");
    expect(section).toContain("Civilizational Role");
    expect(section).toContain("Integration Insight");
    expect(section).toContain("scaffolding");
    expect(section).toContain("• ");
    expect(section.length).toBeGreaterThan(200);
  });

  it("composeCivilizationalFunctionSection returns empty for unknown archetype", () => {
    expect(composeCivilizationalFunctionSection({ dominantArchetype: "Unknown" })).toBe("");
    expect(composeCivilizationalFunctionSection({})).toBe("");
  });
});
