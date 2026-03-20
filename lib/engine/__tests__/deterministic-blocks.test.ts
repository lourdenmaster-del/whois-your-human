/**
 * Tests for deterministic block injection.
 */
import { describe, it, expect } from "vitest";
import {
  buildBoundaryConditionsBlock,
  buildFieldSolutionBlock,
  buildLightIdentitySummaryBlock,
  getSolarProfileFromContext,
  injectDeterministicBlocksIntoReport,
} from "../deterministic-blocks";
import type { VectorZero } from "@/lib/vector-zero";

const FIXTURE_VECTOR_ZERO: VectorZero = {
  coherence_score: 0.85,
  primary_wavelength: "580–620 nm",
  secondary_wavelength: "450–480 nm",
  symmetry_profile: { lateral: 0.7, vertical: 0.75, depth: 0.7 },
  beauty_baseline: {
    color_family: "warm-neutral",
    texture_bias: "smooth",
    shape_bias: "balanced",
    motion_bias: "steady",
  },
  three_voice: {
    raw_signal: "Baseline field.",
    custodian: "Vector Zero is baseline.",
    oracle: "The baseline state.",
  },
};

const FIXTURE_REPORT = `1. INITIATION

RAW SIGNAL
Forces at birth.

CUSTODIAN
Pattern.

ORACLE
Identity.

2. SPECTRAL ORIGIN

RAW SIGNAL
Spectral baseline.

CUSTODIAN
Encoding.

ORACLE
Coherence.

3. TEMPORAL ENCODING

RAW SIGNAL
Temporal.

ORACLE
Time.

4. GRAVITATIONAL PATTERNING

RAW SIGNAL
Gravity.

5. DIRECTIONAL FIELD

RAW SIGNAL
Direction.

6. ARCHETYPE REVELATION

RAW SIGNAL
Archetype.

7. ARCHETYPE MICRO-PROFILES

RAW SIGNAL
Micro.

8. BEHAVIORAL EXPRESSION

RAW SIGNAL
Behavior.

9. RELATIONAL FIELD

RAW SIGNAL
Relation.

10. ENVIRONMENTAL RESONANCE

RAW SIGNAL
Environment.

11. COSMOLOGY OVERLAY

RAW SIGNAL
Cosmology.

12. IDENTITY FIELD EQUATION

RAW SIGNAL
Identity.

13. LEGACY TRAJECTORY

RAW SIGNAL
Legacy.

14. INTEGRATION

RAW SIGNAL
Integration.`;

describe("deterministic-blocks", () => {
  it("getSolarProfileFromContext returns null when sunLonDeg missing", () => {
    expect(getSolarProfileFromContext({})).toBeNull();
    expect(getSolarProfileFromContext({ lat: 40 })).toBeNull();
  });

  it("buildBoundaryConditionsBlock always renders with unknown when empty", () => {
    const block = buildBoundaryConditionsBlock({});
    expect(block).toContain("(L) BOUNDARY CONDITIONS");
    expect(block).toContain("Location:     unknown");
    expect(block).toContain("Coordinates:  unknown");
    expect(block).toContain("Timezone:     unknown");
    expect(block).toContain("Sun:");
    expect(block).toContain("Altitude:   unknown");
  });

  it("buildLightIdentitySummaryBlock includes wavelength bands", () => {
    const block = buildLightIdentitySummaryBlock(
      "Stabiliora",
      null,
      { phenomenon: "Solar photosphere" },
      FIXTURE_VECTOR_ZERO
    );
    expect(block).toContain("primary:   580–620 nm");
    expect(block).toContain("secondary: 450–480 nm");
  });

  it("buildFieldSolutionBlock uses resolved regime header", () => {
    const block = buildFieldSolutionBlock(
      {
        seasonIndex: 0,
        archetype: "Stabiliora",
        lonCenterDeg: 0,
        solarDeclinationDeg: 0,
        seasonalPolarity: "equinoctial",
        anchorType: "none",
      },
      { phenomenon: "X", description: "Y", lightBehaviorKeywords: [] }
    );
    expect(block).toContain("(L) FIELD SOLUTION — resolved regime");
    expect(block).not.toContain("ground truth");
  });

  it("injectDeterministicBlocksIntoReport: BOUNDARY always present, FIELD omitted when no solar", () => {
    const result = injectDeterministicBlocksIntoReport(FIXTURE_REPORT, {
      birthContext: {},
      vectorZero: FIXTURE_VECTOR_ZERO,
    });
    expect(result).toContain("(L) BOUNDARY CONDITIONS");
    expect(result).toContain("Location:     unknown");
    expect(result).not.toContain("(L) FIELD SOLUTION"); // no solar → no field block
  });

  it("injectDeterministicBlocksIntoReport: section anchoring lines in §2–14", () => {
    const result = injectDeterministicBlocksIntoReport(FIXTURE_REPORT, {
      birthContext: {},
      vectorZero: FIXTURE_VECTOR_ZERO,
    });
    const anchor = "Field reference: (L) resolved as unknown with Vector Zero coherence 0.85.";
    expect(result).toContain(anchor);
    // Should appear in multiple sections (at least 2 and 3)
    const count = (result.match(new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("injectDeterministicBlocksIntoReport uses resolvedArchetype when solar profile is missing", () => {
    const result = injectDeterministicBlocksIntoReport(FIXTURE_REPORT, {
      birthContext: {},
      vectorZero: FIXTURE_VECTOR_ZERO,
      resolvedArchetype: "Fluxionis",
    });
    expect(result).toContain("Regime:          Fluxionis");
    expect(result).toContain(
      "Field reference: (L) resolved as Fluxionis with Vector Zero coherence 0.85."
    );
  });

  it("DRY_RUN sample: full injected report structure", () => {
    const fullFixture = `[DRY RUN] Full report placeholder for Test User

1. INITIATION

RAW SIGNAL
Forces at 1990-01-15  in New York.

CUSTODIAN
Structural pattern formed at initialization.

ORACLE
The identity at rest before environmental modulation.

2. SPECTRAL ORIGIN

RAW SIGNAL
Spectral baseline.

CUSTODIAN
Biological encoding.

ORACLE
Baseline coherence.

3. TEMPORAL ENCODING

RAW SIGNAL
Temporal encoding.

4. GRAVITATIONAL PATTERNING

RAW SIGNAL
Gravitational field.

5. DIRECTIONAL FIELD

RAW SIGNAL
Directional vectors.

6. ARCHETYPE REVELATION

RAW SIGNAL
Archetype emergence.

7. ARCHETYPE MICRO-PROFILES

RAW SIGNAL
Micro-profile data.

8. BEHAVIORAL EXPRESSION

RAW SIGNAL
Behavioral expression.

9. RELATIONAL FIELD

RAW SIGNAL
Relational vectors.

10. ENVIRONMENTAL RESONANCE

RAW SIGNAL
Environmental resonance.

11. COSMOLOGY OVERLAY

RAW SIGNAL
Cosmology overlay.

12. IDENTITY FIELD EQUATION

RAW SIGNAL
Identity field.

13. LEGACY TRAJECTORY

RAW SIGNAL
Legacy trajectory.

14. INTEGRATION

RAW SIGNAL
Integration synthesis.`;

    const result = injectDeterministicBlocksIntoReport(fullFixture, {
      birthContext: {},
      vectorZero: FIXTURE_VECTOR_ZERO,
    });

    // SUMMARY, RESOLUTION KEYS, ALLOWED CITATION KEYS after §1
    expect(result).toContain("(L) LIGHT IDENTITY SUMMARY");
    expect(result).toContain("(L) RESOLUTION KEYS");
    expect(result).toContain("(L) ALLOWED CITATION KEYS");
    expect(result).toContain("solar_altitude");
    expect(result).toContain("vector_zero_coherence");
    expect(result).toContain("Regime:          unknown");
    expect(result).toMatch(/Archetype:\s+unknown/);
    expect(result).toContain("Solar season:     unknown");
    expect(result).toContain("primary:   580–620 nm");
    expect(result).toContain("secondary: 450–480 nm");

    // BOUNDARY at §2
    expect(result).toContain("(L) BOUNDARY CONDITIONS");
    expect(result).toContain("Location:     unknown");

    // No FIELD (no solar)
    expect(result).not.toContain("(L) FIELD SOLUTION");

    // Anchoring
    expect(result).toContain("Field reference: (L) resolved as unknown with Vector Zero coherence 0.85.");

    // Emit sample when PRINT_DRY_RUN_SAMPLE=1 (for docs)
    if (process.env.PRINT_DRY_RUN_SAMPLE === "1") {
      console.log("\n=== DRY_RUN SAMPLE OUTPUT ===\n");
      console.log(result);
      console.log("\n=== END ===\n");
    }
  });
});
