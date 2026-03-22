import { describe, it, expect } from "vitest";
import {
  validateReport,
  validateSingleSubject,
  validateSingleRegime,
  validateCitations,
  validateRepetition,
  buildReportRepairPrompt,
  hasDeterministicAnchors,
  extractCanonicalRegimeFromReport,
  validateOracleConcrete,
  normalizeRawSignalCitations,
} from "../reportValidators";

describe("reportValidators", () => {
  const fullReport = `
1. Initiation

(L) denotes the identity field. It resolves at birth within the total physical field.

When Maria Alvarez was born in Denver, Colorado on 12 March 1990, the Earth rotated beneath a specific configuration.

RAW SIGNAL
- Declining solar altitude produces twilight-dominant light. [solar_altitude=-6]
CUSTODIAN
Circadian entrainment under low flux.
ORACLE
People calibrated under fields like this often find comfort in dim transitional light.

2. Spectral Origin

RAW SIGNAL
- Day length gates spectral input. [day_length_minutes=585]
CUSTODIAN
Retinal calibration.
ORACLE
Extended daylight regimes produce energy rhythms active later.

6. Archetype Revelation

RAW SIGNAL
- Stabiliora emerges from waning polar conditions. [regime=Stabiliora]
CUSTODIAN
Stabilization strategy.
ORACLE
Individuals with this configuration often gravitate toward roles with clear structure.

7. Archetype Micro-Profiles

ORACLE
Environments with high-structure institutions tend to reinforce this regime; roles like teacher or organizer appear frequently.
`;

  it("validateSingleSubject passes when name/location match", () => {
    const issues = validateSingleSubject(fullReport, {
      fullName: "Maria Alvarez",
      birthDate: "1990-03-12",
      birthLocation: "Denver, Colorado",
    });
    expect(issues).toHaveLength(0);
  });

  it("validateSingleSubject flags missing when report has different name (full anchor required)", () => {
    const issues = validateSingleSubject(fullReport, {
      fullName: "John Smith",
      birthDate: "1990-03-12",
      birthLocation: "Denver, Colorado",
    });
    expect(issues.some((i) => i.code === "SUBJECT_NAME_MISSING")).toBe(true);
  });

  it("validateSingleSubject flags missing name", () => {
    const noName = fullReport.replace(/When Maria Alvarez was born/g, "When the organism entered");
    const issues = validateSingleSubject(noName, {
      fullName: "Maria Alvarez",
      birthDate: "1990-03-12",
      birthLocation: "Denver, Colorado",
    });
    expect(issues.some((i) => i.code === "SUBJECT_NAME_MISSING")).toBe(true);
  });

  it("validateSingleSubject flags missing when full birth anchor sentence is absent", () => {
    const unpatterned = fullReport.replace(
      /When Maria Alvarez was born in Denver, Colorado on 12 March 1990/,
      "The identity field resolved at birth for Maria Alvarez in Denver, Colorado on 12 March 1990"
    );
    const issues = validateSingleSubject(unpatterned, {
      fullName: "Maria Alvarez",
      birthDate: "1990-03-12",
      birthLocation: "Denver, Colorado",
    });
    expect(issues.some((i) => i.code === "SUBJECT_NAME_MISSING")).toBe(true);
  });

  it("validateSingleRegime passes when §6 matches canonical", () => {
    const reportWithBlocks = fullReport + `
------------------------------------------------------------
(L) LIGHT IDENTITY SUMMARY
------------------------------------------------------------
Archetype:        Stabiliora
...
------------------------------------------------------------
(L) RESOLUTION KEYS
------------------------------------------------------------
Regime:          Stabiliora
...`;
    const issues = validateSingleRegime(reportWithBlocks, "Stabiliora");
    expect(issues).toHaveLength(0);
  });

  it("validateSingleRegime flags regime mismatch in §6", () => {
    const reportWithBlocks = fullReport.replace(/Stabiliora/g, "Fluxionis") + `
(L) LIGHT IDENTITY SUMMARY
Archetype:        Stabiliora
(L) RESOLUTION KEYS
Regime:          Stabiliora`;
    const issues = validateSingleRegime(reportWithBlocks, "Stabiliora");
    expect(issues.some((i) => i.code === "REGIME_MISMATCH")).toBe(true);
  });

  it("validateCitations passes valid citations", () => {
    const issues = validateCitations(fullReport);
    expect(issues.filter((i) => i.code.startsWith("CITATION"))).toHaveLength(0);
  });

  it("validateCitations flags forbidden key", () => {
    const bad = fullReport.replace("[solar_altitude=-6]", "[invented_key=123]");
    const issues = validateCitations(bad);
    expect(issues.some((i) => i.code === "CITATION_KEY_FORBIDDEN")).toBe(true);
  });

  it("validateCitations flags placeholder value", () => {
    const bad = fullReport.replace("[day_length_minutes=585]", "[day_length_minutes=known]");
    const issues = validateCitations(bad);
    expect(issues.some((i) => i.code === "CITATION_PLACEHOLDER")).toBe(true);
  });

  it("validateCitations passes bullet with one citation and other bracket text (e.g. [see note] [regime=X])", () => {
    const reportWithExtraBracket = fullReport.replace(
      "Declining solar altitude produces twilight-dominant light. [solar_altitude=-6]",
      "Declining solar altitude [see section 2] produces twilight-dominant light. [solar_altitude=-6]"
    );
    const issues = validateCitations(reportWithExtraBracket);
    expect(issues.some((i) => i.code === "CITATION_MULTIPLE")).toBe(false);
  });

  it("validateCitations flags bullet with two valid [key=value] citations", () => {
    const reportWithTwoCitations = fullReport.replace(
      "Day length gates spectral input. [day_length_minutes=585]",
      "Day length gates spectral input. [day_length_minutes=585] [regime=Stabiliora]"
    );
    const issues = validateCitations(reportWithTwoCitations);
    expect(issues.some((i) => i.code === "CITATION_MULTIPLE")).toBe(true);
  });

  it("normalizeRawSignalCitations keeps only last [key=value] per bullet", () => {
    const reportWithTwoCitations = fullReport.replace(
      "Day length gates spectral input. [day_length_minutes=585]",
      "Day length gates spectral input. [day_length_minutes=585] [regime=Stabiliora]"
    );
    const normalized = normalizeRawSignalCitations(reportWithTwoCitations);
    expect(normalized).toContain("[regime=Stabiliora]");
    expect(normalized).not.toContain("[day_length_minutes=585] [regime=Stabiliora]");
    const issues = validateCitations(normalized);
    expect(issues.some((i) => i.code === "CITATION_MULTIPLE")).toBe(false);
  });

  it("normalizeRawSignalCitations keeps allowed citation when forbidden present", () => {
    const reportWithForbidden = fullReport.replace(
      "Day length gates spectral input. [day_length_minutes=585]",
      "Day length gates spectral input. [invented_key=123] [day_length_minutes=585]"
    );
    const normalized = normalizeRawSignalCitations(reportWithForbidden);
    expect(normalized).toContain("[day_length_minutes=585]");
    expect(normalized).not.toContain("[invented_key=123]");
    const issues = validateCitations(normalized);
    expect(issues.some((i) => i.code === "CITATION_MULTIPLE")).toBe(false);
  });

  it("validateRepetition passes when sections differ", () => {
    const issues = validateRepetition(fullReport);
    expect(issues.filter((i) => i.code === "REPETITION_HIGH")).toHaveLength(0);
  });

  it("hasDeterministicAnchors returns false when blocks missing", () => {
    expect(hasDeterministicAnchors("Just some text")).toBe(false);
    expect(hasDeterministicAnchors(fullReport)).toBe(false);
  });

  it("hasDeterministicAnchors returns true when required blocks present (RESOLUTION KEYS + BOUNDARY CONDITIONS)", () => {
    const withBlocks = fullReport + `
------------------------------------------------------------
(L) RESOLUTION KEYS
Regime: Stabiliora
------------------------------------------------------------
------------------------------------------------------------
(L) BOUNDARY CONDITIONS
Location: Denver
------------------------------------------------------------`;
    expect(hasDeterministicAnchors(withBlocks)).toBe(true);
  });

  it("hasDeterministicAnchors returns false when only one required block present", () => {
    expect(hasDeterministicAnchors("(L) RESOLUTION KEYS\nRegime: X")).toBe(false);
    expect(hasDeterministicAnchors("(L) BOUNDARY CONDITIONS\nLocation: X")).toBe(false);
  });

  it("extractCanonicalRegimeFromReport extracts full line after Regime:", () => {
    expect(extractCanonicalRegimeFromReport("(L) RESOLUTION KEYS\nRegime: Fluxionis\nmore")).toBe("Fluxionis");
    expect(extractCanonicalRegimeFromReport("(L) RESOLUTION KEYS\nRegime: Stabiliora (index 1)\n")).toBe("Stabiliora (index 1)");
  });

  it("validateOracleConcrete flags generic 'favors balance'", () => {
    const generic = `
7. Archetype Micro-Profiles
ORACLE
This regime favors balance and stability.
`;
    const issues = validateOracleConcrete(generic);
    expect(issues.some((i) => i.code === "ORACLE_TOO_GENERIC")).toBe(true);
  });

  it("buildReportRepairPrompt includes subject and regime", () => {
    const { system, user } = buildReportRepairPrompt(
      "Report text",
      [{ code: "X", message: "Fix me" }],
      {
        subjectInput: { fullName: "Jane", birthDate: "2000-01-01", birthLocation: "NYC" },
        canonicalRegime: "Ignispectrum",
      }
    );
    expect(user).toContain("Jane");
    expect(user).toContain("NYC");
    expect(user).toContain("Ignispectrum");
    expect(system).toContain("Do NOT modify");
  });
});
