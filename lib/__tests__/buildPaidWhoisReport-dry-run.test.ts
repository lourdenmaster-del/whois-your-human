/**
 * Unit tests for buildPaidWhoisReport with dry-run-style data.
 * Validates: paid WHOIS buildability for a reportId produced by dry-run,
 * required fields on FreeWhoisReport, optional field behavior (lightSignatureDisplay, chronoImprintResolved, originCoordinatesDisplay).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPaidWhoisReport, buildFreeWhoisReport, renderFreeWhoisReport, renderFreeWhoisReportText } from "../free-whois-report";
import { composeArchetypeOpening } from "../report-composition";
import { getPrimaryArchetypeFromSolarLongitude } from "@/src/ligs/image/triangulatePrompt";
import { getSolarSeasonIndexFromLongitude, getSolarSeasonByIndex, SOLAR_SEASONS } from "@/src/ligs/astronomy/solarSeason";
import { approximateSunLongitudeFromDate } from "@/lib/terminal-intake/approximateSunLongitude";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const mockGetReport = vi.fn();
const mockLoadBeautyProfileV1 = vi.fn();

vi.mock("@/lib/report-store", () => ({
  getReport: (id: string) => mockGetReport(id),
}));

vi.mock("@/lib/beauty-profile-store", () => ({
  loadBeautyProfileV1: (id: string, requestId: string) => mockLoadBeautyProfileV1(id, requestId),
}));

/** Minimal stored report shape returned by engine/generate dry-run path. */
function createDryRunStoredReport(reportId: string) {
  return {
    full_report: `[DRY RUN] Full report placeholder.

1. INITIATION
RAW SIGNAL
Forces at 1990-01-15 14:30 in New York.
CUSTODIAN
Structural pattern formed at initialization.
ORACLE
The identity at rest.

2. SPECTRAL ORIGIN
RAW SIGNAL
Spectral baseline.
CUSTODIAN
Biological encoding.
ORACLE
Baseline coherence.`,
    emotional_snippet: "[DRY RUN] Light signature at New York: a structural pattern formed by forces at initialization.",
    image_prompts: [],
    vector_zero: {
      coherence_score: 0.85,
      primary_wavelength: "580–620 nm",
      secondary_wavelength: "450–480 nm",
      symmetry_profile: { lateral: 0.7, vertical: 0.75, depth: 0.7 },
      beauty_baseline: { color_family: "warm-neutral", texture_bias: "smooth", shape_bias: "balanced", motion_bias: "steady" },
      three_voice: {
        raw_signal: "Baseline field.",
        custodian: "Vector Zero is the baseline.",
        oracle: "The baseline state.",
      },
    },
    createdAt: Date.now(),
  };
}

/** Minimal BeautyProfileV1 shape produced by dry-run route (buildDryRunBeautyProfileV1). Includes birth fields so paid WHOIS can resolve solar/archetype. */
function createDryRunProfile(reportId: string, subjectName: string) {
  return {
    version: "1.0" as const,
    reportId,
    subjectName,
    birthDate: "1990-01-15",
    birthTime: "14:30",
    birthLocation: "New York, NY",
    emotionalSnippet: "[DRY RUN] Light signature.",
    fullReport: "[DRY RUN] Placeholder report.",
    imageUrls: [],
    timings: { totalMs: 0, engineMs: 0, reportFetchMs: 0, beautyFilterMs: 0 },
    vector_zero: {
      three_voice: { raw_signal: "—", custodian: "", oracle: "" },
      beauty_baseline: { color_family: "", texture_bias: "", shape_bias: "", motion_bias: "" },
    },
    light_signature: { raw_signal: "A structural pattern formed by forces at initialization.", custodian: "", oracle: "" },
    archetype: { raw_signal: "—", custodian: "", oracle: "" },
    deviations: { raw_signal: "—", custodian: "", oracle: "" },
    corrective_vector: { raw_signal: "—", custodian: "", oracle: "" },
    imagery_prompts: { vector_zero_beauty_field: "", light_signature_aesthetic_field: "", final_beauty_field: "" },
  };
}

describe("buildPaidWhoisReport with dry-run-style data", () => {
  const reportId = "dry-run-whois-test-id";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReport.mockResolvedValue(createDryRunStoredReport(reportId));
    mockLoadBeautyProfileV1.mockResolvedValue(createDryRunProfile(reportId, "Studio Test User"));
  });

  it("runs successfully and returns a FreeWhoisReport", async () => {
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report).toBeDefined();
    expect(mockGetReport).toHaveBeenCalledWith(reportId);
    expect(mockLoadBeautyProfileV1).toHaveBeenCalledWith(reportId, "test-request");
  });

  it("returns required fields: registryId, name, birthDate, birthTime, birthLocation, solarSignature, archetypeClassification, cosmicAnalogue", async () => {
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.registryId).toBeDefined();
    expect(typeof report.registryId).toBe("string");
    expect(report.registryId.length).toBeGreaterThan(0);
    expect(report.name).toBe("Studio Test User");
    expect(report.birthDate).toBeDefined();
    expect(report.birthTime).toBeDefined();
    expect(report.birthLocation).toBeDefined();
    expect(report.solarSignature).toBeDefined();
    expect(report.archetypeClassification).toBeDefined();
    expect(report.cosmicAnalogue).toBeDefined();
    expect(report.registryStatus).toBe("Registered");
    expect(report.recordAuthority).toBe("LIGS Human WHOIS Registry");
    expect(report.created_at).toBeDefined();
  });

  it("paid WHOIS includes CIVILIZATIONAL FUNCTION and INTEGRATION NOTE sections", async () => {
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    const text = renderFreeWhoisReportText(report);
    expect(text).toContain("CIVILIZATIONAL FUNCTION");
    expect(text).toContain("INTEGRATION NOTE");
    expect(text).toContain("Structural Function");
    expect(text).toContain("Use this record as a reference for understanding where your contribution flows naturally.");
    if (process.env.PRINT_PAID_WHOIS === "1") {
      console.log("\n--- PAID WHOIS (plain text) ---\n");
      console.log(text);
      console.log("\n--- END ---\n");
    }
  });

  it("omits Light Signature from paid WHOIS top block (artifact is visual, not text)", async () => {
    mockLoadBeautyProfileV1.mockResolvedValue({
      ...createDryRunProfile(reportId, "Light Sig Test"),
      light_signature: { raw_signal: "Custom light signature text.", custodian: "", oracle: "" },
    });
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect((report as { lightSignatureDisplay?: string }).lightSignatureDisplay).toBeUndefined();
  });

  it("sets originCoordinatesDisplay from profile when no birthContext passed", async () => {
    mockLoadBeautyProfileV1.mockResolvedValue({
      ...createDryRunProfile(reportId, "Origin Test"),
      originCoordinatesDisplay: "New York, 40.7128°N, 74.0060°W",
    });
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.originCoordinatesDisplay).toBe("New York, 40.7128°N, 74.0060°W");
  });

  it("falls back to storedReport.originCoordinatesDisplay when profile lacks it (Studio dry-run path)", async () => {
    mockGetReport.mockResolvedValue({
      ...createDryRunStoredReport(reportId),
      originCoordinatesDisplay: "Boston, 42.3601°N, 71.0589°W",
    });
    mockLoadBeautyProfileV1.mockResolvedValue(createDryRunProfile(reportId, "Studio Test User"));
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.originCoordinatesDisplay).toBe("Boston, 42.3601°N, 71.0589°W");
  });

  it("uses profile.solarSeasonProfile and profile.dominantArchetype when present (complete dry-run profile)", async () => {
    mockLoadBeautyProfileV1.mockResolvedValue({
      ...createDryRunProfile(reportId, "Complete Profile"),
      solarSeasonProfile: {
        seasonIndex: 9,
        archetype: "Structoris",
        lonCenterDeg: 285,
        solarDeclinationDeg: -20,
        declinationAbs: 20,
        seasonalPolarity: "waning" as const,
        insolationProxy01: 0.5,
        twilightClass: "day",
        dayLengthNorm01: 0.6,
      },
      dominantArchetype: "Structoris",
    });
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.archetypeClassification).toBe("Structoris");
    expect(report.solarSignature).toBe("December Solstice");
    expect(report.cosmicAnalogue).toContain("cosmic web");
  });

  it("uses profile birth fields when params omitted (dry-run profile with birth fields)", async () => {
    mockLoadBeautyProfileV1.mockResolvedValue({
      ...createDryRunProfile(reportId, "Birth Fields Test"),
      birthDate: "1990-01-15",
      birthTime: "14:30",
      birthLocation: "New York, NY",
    });
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.birthDate).toBe("1990-01-15");
    expect(report.birthTime).toBe("14:30");
    expect(report.birthLocation).toBe("New York, NY");
  });

  it("throws PAID_WHOIS_REPORT_NOT_FOUND when getReport returns undefined", async () => {
    mockGetReport.mockResolvedValue(undefined);
    await expect(buildPaidWhoisReport({ reportId, requestId: "test-request" })).rejects.toThrow("PAID_WHOIS_REPORT_NOT_FOUND");
  });

  it("includes vectorZeroAddendumBody when stored report has vector_zero.three_voice", async () => {
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.vectorZeroAddendumBody).toBeDefined();
    expect(report.vectorZeroAddendumBody).toContain("Baseline field.");
  });

  it("uses parsed identityArchitectureBody when sections 1 and 2 present", async () => {
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.identityArchitectureBody).toBeDefined();
    expect(report.identityArchitectureBody).not.toBe("[Identity Architecture section unavailable]");
    expect(report.identityArchitectureBody).toContain("RAW SIGNAL");
    expect(report.identityArchitectureBody).toContain("Forces at");
  });

  it("uses explicit placeholder for identityArchitectureBody when sections 1 and 2 unparseable", async () => {
    mockGetReport.mockResolvedValue({
      ...createDryRunStoredReport(reportId),
      full_report: "No section headers here.\n\nJust free-form text that does not match N. TITLE pattern.",
    });
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.identityArchitectureBody).toBe("[Identity Architecture section unavailable]");
  });

  it("uses explicit placeholder for interpretiveNotesBody when sections 12-14 unparseable", async () => {
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.interpretiveNotesBody).toBe("[Interpretive Notes section unavailable]");
  });

  it("rendered report shows explicit placeholders when parse fails (no generic prose)", async () => {
    mockGetReport.mockResolvedValue({
      ...createDryRunStoredReport(reportId),
      full_report: "Unstructured content without N. TITLE section headers.",
      field_conditions_context: undefined,
    });
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    const text = renderFreeWhoisReportText(report);
    expect(text).toContain("[Identity Architecture section unavailable]");
    expect(text).toContain("[Field Conditions section unavailable]");
    expect(text).toContain("[Interpretive Notes section unavailable]");
    expect(text).not.toContain("The registry identifies a stable identity structure arising within the total field");
    expect(text).not.toContain("Classification emerges from field conditions and force structure");
    expect(text).not.toContain("Expanded interpretive sections ship with the complete registration report");
  });

  it("civilizationalFunctionBody: valid content present uses real content", async () => {
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.civilizationalFunctionBody).toBeDefined();
    expect(report.civilizationalFunctionBody).not.toBe("[Civilizational Function section unavailable]");
    expect(report.civilizationalFunctionBody).toContain("Structural Function");
    expect(report.civilizationalFunctionBody).toContain("Contribution Environments");
  });

  it("civilizationalFunctionBody: render uses explicit placeholder when empty", async () => {
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    (report as { civilizationalFunctionBody?: string }).civilizationalFunctionBody = "";
    const text = renderFreeWhoisReportText(report);
    expect(text).toContain("[Civilizational Function section unavailable]");
  });

  it("vectorZeroAddendumBody: valid content present uses real content", async () => {
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.vectorZeroAddendumBody).toBeDefined();
    expect(report.vectorZeroAddendumBody).not.toBe("[Vector Zero addendum unavailable]");
    expect(report.vectorZeroAddendumBody).toContain("Baseline field.");
  });

  it("vectorZeroAddendumBody: render uses explicit placeholder when missing (no generic prose)", async () => {
    mockGetReport.mockResolvedValue({
      ...createDryRunStoredReport(reportId),
      vector_zero: {
        coherence_score: 0.85,
        primary_wavelength: "580–620 nm",
        secondary_wavelength: "450–480 nm",
        symmetry_profile: { lateral: 0.7, vertical: 0.75, depth: 0.7 },
        beauty_baseline: { color_family: "warm-neutral", texture_bias: "smooth", shape_bias: "balanced", motion_bias: "steady" },
        three_voice: { raw_signal: "", custodian: "", oracle: "" },
      },
    });
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.vectorZeroAddendumBody).toBeUndefined();
    const text = renderFreeWhoisReportText(report);
    expect(text).toContain("[Vector Zero addendum unavailable]");
    expect(text).not.toContain("As an early registry participant, your WHOIS record has been expanded");
  });

  it("uses explicit placeholder for fieldConditionsBody when field_conditions_context and s2to5 both null", async () => {
    mockGetReport.mockResolvedValue({
      ...createDryRunStoredReport(reportId),
      full_report: "1. INITIATION\nOnly section 1.\n\nNo sections 2-5.",
      field_conditions_context: undefined,
    });
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.fieldConditionsBody).toBe("[Field Conditions section unavailable]");
  });

  it("hydrates Magnetic/Climate/Sensory and FIELD CONDITIONS from storedReport when persisted by engine/generate", async () => {
    mockGetReport.mockResolvedValue({
      ...createDryRunStoredReport(reportId),
      field_conditions_context: {
        sunAltitudeDeg: 25,
        sunAzimuthDeg: 210,
        sunriseLocal: "1990-01-15T07:15:00.000-05:00",
        sunsetLocal: "1990-01-15T17:00:00.000-05:00",
        dayLengthMinutes: 585,
        moonPhaseName: "Waning Gibbous",
        moonIlluminationFrac: 0.8,
        moonAltitudeDeg: 45,
        moonAzimuthDeg: 120,
        sunLonDeg: 295,
        solarDeclinationDeg: -20,
        solarPolarity: "waning",
        anchorType: "none",
      },
      magneticFieldIndexDisplay: "K-index 3 (moderate)",
      climateSignatureDisplay: "Mild winter conditions",
      sensoryFieldConditionsDisplay: "Daylight; cool air; partly cloudy",
    });
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    expect(report.magneticFieldIndexDisplay).toBe("K-index 3 (moderate)");
    expect(report.climateSignatureDisplay).toBe("Mild winter conditions");
    expect(report.sensoryFieldConditionsDisplay).toBe("Daylight; cool air; partly cloudy");
    expect(report.fieldConditionsBody).toBeDefined();
    expect(report.fieldConditionsBody).toContain("Sun altitude 25°");
    expect(report.fieldConditionsBody).toContain("Sunrise");
    expect(report.fieldConditionsBody).toContain("Sunset");
    expect(report.fieldConditionsBody).toContain("Day length 585 min");
    expect(report.fieldConditionsBody).toContain("Moon phase Waning Gibbous");
    expect(report.fieldConditionsBody).toMatch(/Solar longitude \d+°/);
    expect(report.fieldConditionsBody).toMatch(/Anchor type: \w+/);
  });

  it("Identity Architecture uses humanExpression without duplicate article (as The Architect not as the The Architect)", () => {
    const lines = composeArchetypeOpening({ dominantArchetype: "Structoris" });
    const sentence = lines[0] ?? "";
    expect(sentence).toContain("The Architect");
    expect(sentence).not.toMatch(/as the The\s/);
    expect(sentence).toMatch(/operates as The Architect within the STRUCTORIS\s+regime/);
  });

  it("renders paid WHOIS report as HTML and text (output for email/viewer)", async () => {
    const report = await buildPaidWhoisReport({ reportId, requestId: "test-request" });
    const html = renderFreeWhoisReport(report);
    const text = renderFreeWhoisReportText(report);
    const outDir = join(process.cwd(), "tmp-whois-render");
    try {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(outDir, { recursive: true });
    } catch {
      // ignore
    }
    writeFileSync(join(outDir, "paid-whois-report.html"), html, "utf8");
    writeFileSync(join(outDir, "paid-whois-report.txt"), text, "utf8");
  });

  it("solar segment index: same birth date yields same segment and archetype (canonical formula consistency)", () => {
    const data = { email: "test@example.com", created_at: new Date().toISOString(), birthDate: "1990-01-15", birthPlace: "New York, NY", birthTime: "14:30" };
    const freeReport = buildFreeWhoisReport(data);
    const lon = approximateSunLongitudeFromDate("1990-01-15");
    expect(lon).not.toBeNull();
    const index = getSolarSeasonIndexFromLongitude(lon!);
    const archetype = getPrimaryArchetypeFromSolarLongitude(lon!);
    const entry = getSolarSeasonByIndex(index);
    expect(freeReport.archetypeClassification).toBe(archetype);
    expect(entry?.archetype).toBe(archetype);
    expect(SOLAR_SEASONS[index]?.archetype).toBe(archetype);
    expect(freeReport.solarSignature).not.toBe("—");
  });
});
