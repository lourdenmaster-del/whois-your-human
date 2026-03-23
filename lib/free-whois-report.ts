/**
 * Shared free WHOIS report — single source of truth for the free registry record.
 * Used by: (1) waitlist confirmation email, (2) landing in-page report (same HTML).
 * Do NOT create a second template; email and free report render from renderFreeWhoisReport(report).
 *
 * Solar Segment = canonical 12-part solar-physics season (sun longitude → segment index).
 * Archetype Classification = archetype resolved from that segment. Cosmic analogue from that archetype.
 */

import { generateLirId } from "@/src/ligs/marketing/identity-spec";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { approximateSunLongitudeFromDate } from "@/lib/terminal-intake/approximateSunLongitude";
import { getPrimaryArchetypeFromSolarLongitude } from "@/src/ligs/image/triangulatePrompt";
import { getSolarSeasonByIndex, getSolarSeasonIndexFromLongitude } from "@/src/ligs/astronomy/solarSeason";
import { getVectorZeroImageUrl } from "@/lib/vector-zero-assets";
import { getArchetypePreviewConfig } from "@/lib/archetype-preview-config";
import { getArchetypeStaticImagePathOrFallback } from "@/lib/archetype-static-images";
import { getReport, type FieldConditionsContext } from "@/lib/report-store";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";
import { log } from "@/lib/log";
import { composeCosmicTwin, composeArchetypeSummary, composeCivilizationalFunctionSection } from "@/lib/report-composition";
import type { BirthContextForReport } from "@/lib/engine/computeBirthContextForReport";
import { formatAgentDirectivesForDisplay, formatProtocolForDisplay, type AgentDirectives, type WhoIsProtocol } from "@/lib/whois-protocol";

/** Return display strings for agent_directives; handles legacy (string) and new (structured) formats. */
function getAgentDirectivesDisplayStrings(
  ad: AgentDirectives | { response_style: string; pacing: string; structure_rules: string; decision_presentation: string; intervention_triggers: string }
): { response_style: string; pacing: string; structure_rules: string; decision_presentation: string; intervention_triggers: string } {
  if (typeof (ad as { response_style?: unknown }).response_style === "string") {
    const leg = ad as { response_style: string; pacing: string; structure_rules: string; decision_presentation: string; intervention_triggers: string };
    return leg;
  }
  return formatAgentDirectivesForDisplay(ad as AgentDirectives);
}

/**
 * Solar Segment names: 12 equal 30° segments aligned with SOLAR_SEASONS.
 * Index = getSolarSeasonIndexFromLongitude(lon) = floor(normalized / 30), cap 11.
 * Boundaries: [0,30) March Equinox, [30,60) Early-Spring, … [330,360) Late-Winter.
 */
const CANONICAL_SOLAR_SEGMENT_NAMES: readonly string[] = [
  "March Equinox",     // 0
  "Early-Spring",      // 1
  "Mid-Spring",        // 2
  "June Solstice",     // 3
  "Early-Summer",      // 4
  "Mid-Summer",        // 5
  "September Equinox", // 6
  "Early-Autumn",      // 7
  "Mid-Autumn",        // 8
  "December Solstice", // 9
  "Early-Winter",      // 10
  "Late-Winter",       // 11
];

export interface FreeWhoisReportData {
  email: string;
  created_at: string;
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  preview_archetype?: string;
  solar_season?: string;
  source?: string;
  /** FREE TIER: deterministic protocol from buildWhoisProtocol. Primary surface when present. */
  protocol?: WhoIsProtocol;
}

export interface FreeWhoisReport {
  registryId: string;
  registryStatus: string;
  created_at: string;
  recordAuthority: string;
  name: string;
  birthDate: string;
  birthLocation: string;
  birthTime: string;
  solarSignature: string;
  archetypeClassification: string;
  cosmicAnalogue: string;
  /** Set by caller (e.g. waitlist route) via getRegistryArtifactImageUrl(archetypeClassification, email). Rendered exactly once in renderFreeWhoisReport(). */
  artifactImageUrl?: string;
  /** Optional. When set, Vector Zero variant = this value % 4 (rotation). Prefer registry count at send time. */
  vectorZeroRotationIndex?: number;
  /** Genesis Metadata: sun longitude (0–360° ecliptic) when birthDate present. */
  sunLongitudeDeg?: number | null;
  /** Genesis Metadata: solar season anchor type from solarSeason (equinox | solstice | crossquarter | none). */
  solarAnchorType?: string;
  /** Genesis Metadata: waxing | waning from longitude. */
  seasonalPolarity?: string;
  /** When set, Chrono-Imprint shows this (e.g. "13:30 local / 18:30 UTC"). Resolved server-side when date+time+place available via timezone-aware conversion. */
  chronoImprintResolved?: string | null;

  /** Paid WHOIS only. When set, full report uses this instead of the default Identity Architecture paragraph. */
  identityArchitectureBody?: string | null;
  /** Paid WHOIS only. When set, full report uses this instead of the default Field Conditions paragraph. */
  fieldConditionsBody?: string | null;
  /** Paid WHOIS only. When set, full report uses this instead of the single-line Cosmic Twin. */
  cosmicTwinBody?: string | null;
  /** Paid WHOIS only. When set, full report uses this instead of the single-line Archetype Expression. */
  archetypeExpressionBody?: string | null;
  /** Paid WHOIS only. When set, full report uses this instead of the default Interpretive Notes paragraph. */
  interpretiveNotesBody?: string | null;
  /** Paid WHOIS only. When set, full report uses this as expanded Vector Zero addendum content (before archetype line and image). */
  vectorZeroAddendumBody?: string | null;
  /** Paid WHOIS only. CIVILIZATIONAL FUNCTION section body (from composeCivilizationalFunctionSection). */
  civilizationalFunctionBody?: string | null;
  /** Paid WHOIS only. INTEGRATION NOTE section body; when unset, default closing prose is used. */
  integrationNoteBody?: string | null;

  /** Paid WHOIS only. When set, Genesis table shows this for Origin Coordinates; else "Restricted Node Data". */
  originCoordinatesDisplay?: string | null;
  /** Paid WHOIS only. When set, Genesis table shows this for Magnetic Field Index; else "Restricted Node Data". */
  magneticFieldIndexDisplay?: string | null;
  /** Paid WHOIS only. When set, Genesis table shows this for Climate Signature; else "Restricted Node Data". */
  climateSignatureDisplay?: string | null;
  /** Paid WHOIS only. When set, Genesis table shows this for Sensory Field Conditions; else "Restricted Node Data". */
  sensoryFieldConditionsDisplay?: string | null;
  /** FREE TIER: deterministic protocol. When present, these 7 fields are the primary surface; report sections secondary. */
  protocol?: WhoIsProtocol;
}

const DEFAULT_SITE_URL = "https://ligs.io";

/** Canonical INTEGRATION NOTE section body for paid WHOIS. */
const INTEGRATION_NOTE_DEFAULT =
  "This registry record describes the physical and structural pattern present at the moment of origin.\n" +
  "No pattern is better or worse than another. Each represents a different way human systems remain functional and adaptive.\n\n" +
  "Coherence increases when individuals operate in environments aligned with their structural role.\n" +
  "Friction increases when they attempt to function against it.\n\n" +
  "Use this record as a reference for understanding where your contribution flows naturally.";

/** FREE-TIER FALLBACK: sections shown when paid content is absent. Structural, registry-like, machine-facing. */
const FREE_TIER_IDENTITY_ARCHITECTURE =
  "Registry identifies a stable identity structure arising within the field of forces present at birth. " +
  "Structural classification derived from origin coordinates. Expanded analysis held on registry node.";
const FREE_TIER_FIELD_CONDITIONS =
  "Classification derives from field conditions and force structure at the birth event. " +
  "Solar longitude, seasonal context, and chrono-imprint establish baseline. Extended field data available on registry node.";
const FREE_TIER_CIVILIZATIONAL_FUNCTION =
  "Archetype classification determines civilizational placement. Structural role inferred from solar segment. " +
  "Full civilizational mapping held on registry node.";
const FREE_TIER_INTERPRETIVE_NOTES =
  "Interpretive notes are held on the registry node; this extract contains the fields cleared for release.";
const FREE_TIER_VECTOR_ZERO_ADDENDUM =
  "Vector Zero marks the structural origin point of the archetype. Directional bias inferred from solar segment. " +
  "Full three-voice expansion available on registry node.";

const UNAVAILABLE_PATTERNS = [
  "[Identity Architecture section unavailable]",
  "[Field Conditions section unavailable]",
  "[Civilizational Function section unavailable]",
  "[Interpretive Notes section unavailable]",
  "[Vector Zero addendum unavailable]",
];

function resolveSectionContent(
  body: string | null | undefined,
  fallback: string
): string {
  if (body != null && typeof body === "string" && body.trim() !== "" && !UNAVAILABLE_PATTERNS.includes(body.trim())) {
    return body.trim();
  }
  return fallback;
}

/** Solar longitude for public display: max 2 decimal places. Does not change underlying value. */
function formatSolarLongitudeDisplay(deg: number): string {
  return `${Number(deg).toFixed(2)}° solar longitude`;
}

/** Format persisted field_conditions_context (from engine/generate) as FIELD CONDITIONS body for paid WHOIS. */
function formatFieldConditionsContextForWhois(ctx: FieldConditionsContext): string {
  const lines: string[] = [];
  if (typeof ctx.sunAltitudeDeg === "number") {
    lines.push(`Sun altitude ${ctx.sunAltitudeDeg}°`);
  }
  if (typeof ctx.sunAzimuthDeg === "number") {
    lines.push(`Sun azimuth ${ctx.sunAzimuthDeg}°`);
  }
  if (typeof ctx.sunriseLocal === "string" && ctx.sunriseLocal.trim() !== "") {
    lines.push(`Sunrise: ${ctx.sunriseLocal.trim()}`);
  }
  if (typeof ctx.sunsetLocal === "string" && ctx.sunsetLocal.trim() !== "") {
    lines.push(`Sunset: ${ctx.sunsetLocal.trim()}`);
  }
  if (typeof ctx.dayLengthMinutes === "number") {
    lines.push(`Day length ${ctx.dayLengthMinutes} min`);
  }
  if (typeof ctx.moonPhaseName === "string" && ctx.moonPhaseName.trim() !== "") {
    lines.push(`Moon phase ${ctx.moonPhaseName.trim()}`);
  }
  if (typeof ctx.moonIlluminationFrac === "number") {
    lines.push(`Moon illumination ${Math.round(ctx.moonIlluminationFrac * 100)}%`);
  }
  if (typeof ctx.sunLonDeg === "number") {
    lines.push(`Solar longitude ${ctx.sunLonDeg}°`);
  }
  if (typeof ctx.anchorType === "string" && ctx.anchorType.trim() !== "") {
    lines.push(`Anchor type: ${ctx.anchorType.trim()}`);
  }
  return lines.join("\n");
}

/** Human-facing solar anchor type. Display only; stored values unchanged. */
function humanizeSolarAnchorType(anchorType: string | undefined): string {
  if (anchorType === "none") return "Inter-segment position";
  if (anchorType === "equinox") return "Equinox anchor";
  if (anchorType === "solstice") return "Solstice anchor";
  if (anchorType === "crossquarter") return "Cross-quarter anchor";
  return anchorType ?? "Restricted Node Data";
}

/** Section boundary: "N. Title" — flexible on spacing. Used for paid WHOIS section extraction. */
const SECTION_HEADING_RE = /(?:\n|^)(\s*)(\d+)\.\s*([^\n]+)/g;

/**
 * Extract the body of section N from full_report (content after "N. Title" until next section or end).
 * Returns trimmed body or null if section not found.
 */
function parseSectionBody(report: string, sectionNum: number): string | null {
  if (!report || typeof report !== "string") return null;
  const matches: Array<{ num: number; headingStart: number; contentStart: number }> = [];
  let m;
  SECTION_HEADING_RE.lastIndex = 0;
  while ((m = SECTION_HEADING_RE.exec(report)) !== null) {
    const num = parseInt(m[2]!, 10);
    matches.push({
      num,
      headingStart: m.index,
      contentStart: m.index + m[0].length,
    });
  }
  const idx = matches.findIndex((x) => x.num === sectionNum);
  if (idx < 0) return null;
  const contentStart = matches[idx]!.contentStart;
  const contentEnd = idx + 1 < matches.length ? matches[idx + 1]!.headingStart : report.length;
  const raw = report.slice(contentStart, contentEnd);
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Extract sections N through M (inclusive) and join with double newline. */
function parseSectionRange(report: string, from: number, to: number): string | null {
  const parts: string[] = [];
  for (let n = from; n <= to; n++) {
    const body = parseSectionBody(report, n);
    if (body) parts.push(body);
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

/** Format birth context for Origin Coordinates display: "PlaceName, lat°N, lon°W". */
function formatOriginCoordinatesDisplay(birthContext: BirthContextForReport): string {
  const placeName = birthContext.placeName ?? (birthContext as Record<string, unknown>).birthLocation;
  const lat = birthContext.lat;
  const lon = birthContext.lon;
  const place = typeof placeName === "string" && placeName.trim() ? placeName.trim() : "Unknown location";
  if (typeof lat === "number" && typeof lon === "number") {
    const latStr = lat >= 0 ? `${Number(lat).toFixed(4)}°N` : `${Number(-lat).toFixed(4)}°S`;
    const lonStr = lon >= 0 ? `${Number(lon).toFixed(4)}°E` : `${Number(-lon).toFixed(4)}°W`;
    return `${place}, ${latStr}, ${lonStr}`;
  }
  return place;
}

/** Format vector_zero.three_voice as a single addendum body (raw_signal, custodian, oracle). */
function formatVectorZeroThreeVoice(tv: {
  raw_signal?: string;
  custodian?: string;
  oracle?: string;
}): string {
  const parts = [
    tv.raw_signal?.trim(),
    tv.custodian?.trim(),
    tv.oracle?.trim(),
  ].filter((s): s is string => typeof s === "string" && s.length > 0);
  return parts.join("\n\n");
}

/** Chrono-Imprint: use value if non-empty and not placeholder; else fallback when provided (e.g. preview registry copy). */
function chronoImprintDisplay(
  reportBirthTime: string | undefined,
  override?: string | null
): string {
  const fromReport =
    reportBirthTime && reportBirthTime.trim() && reportBirthTime !== "—"
      ? reportBirthTime.trim()
      : null;
  if (fromReport) return fromReport;
  const fromOverride =
    override != null && typeof override === "string" && override.trim() && override.trim() !== "—"
      ? override.trim()
      : null;
  return fromOverride ?? "Limited Access";
}

/** Extract HH:mm from ISO timestamp (YYYY-MM-DDTHH:mm...) for Chrono-Imprint display. */
function isoToHHmm(iso: string): string | null {
  if (!iso || iso.length < 16) return null;
  const part = iso.slice(11, 16);
  return /^\d{2}:\d{2}$/.test(part) ? part : null;
}

/** Display-only: format birth time for card. ISO → HH:mm; otherwise return as-is. Does not change data or UTC logic. */
function formatBirthTimeForCardDisplay(birthTime: string): string {
  if (!birthTime || !birthTime.trim()) return birthTime || "—";
  const trimmed = birthTime.trim();
  const fromIso = isoToHHmm(trimmed);
  return fromIso ?? trimmed;
}

/**
 * Resolve local birth time to UTC and return a registry-style Chrono-Imprint display string.
 * Uses existing timezone-aware logic (deriveFromBirthData: geocode → tz-lookup → Luxon local→UTC).
 * EST/EDT handled by IANA zone and date. Server-only; do not call from client.
 * Returns null if any input missing or resolution fails; caller keeps current display.
 */
export async function resolveChronoImprintDisplay(
  birthDate: string,
  birthTime: string,
  birthPlace: string
): Promise<string | null> {
  const dateStr = birthDate?.trim().slice(0, 10);
  const timeStr = birthTime?.trim();
  const placeStr = birthPlace?.trim();
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !timeStr || timeStr === "—" || !placeStr || placeStr === "—") {
    return null;
  }
  try {
    const { deriveFromBirthData } = await import("@/lib/astrology/deriveFromBirthData");
    const derived = await deriveFromBirthData({
      birthdate: dateStr,
      birthtime: timeStr,
      birthplace: placeStr,
    });
    if (!derived?.localTimestamp || !derived?.utcTimestamp) return null;
    const localHHmm = isoToHHmm(derived.localTimestamp);
    const utcHHmm = isoToHHmm(derived.utcTimestamp);
    if (!localHHmm || !utcHHmm) return null;
    return `${localHHmm} local / ${utcHHmm} UTC`;
  } catch {
    return null;
  }
}

/**
 * When report has birthDate + birthTime + birthPlace (non-placeholder), resolve Chrono-Imprint and set report.chronoImprintResolved.
 * No-op when missing or on failure; report unchanged. Used by waitlist and resend routes.
 */
export async function enrichReportChrono(
  report: FreeWhoisReport
): Promise<void> {
  if (
    !report.birthDate ||
    !report.birthTime ||
    !report.birthLocation ||
    report.birthDate === "—" ||
    report.birthTime === "—" ||
    report.birthLocation === "—"
  ) {
    return;
  }
  try {
    const resolved = await resolveChronoImprintDisplay(
      report.birthDate,
      report.birthTime,
      report.birthLocation
    );
    if (resolved) report.chronoImprintResolved = resolved;
  } catch {
    // keep current Chrono-Imprint display
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build the canonical free WHOIS report object from intake/waitlist data.
 * Solar Segment and Archetype Classification from canonical solar resolution (sun longitude → segment index → segment name + getPrimaryArchetypeFromSolarLongitude). Fallback to preview_archetype only when birthDate missing or unparseable. Cosmic analogue from getCosmicAnalogue(archetype).phenomenon.
 * Caller should set report.artifactImageUrl when sending email (e.g. getRegistryArtifactImageUrl).
 */
export function buildFreeWhoisReport(data: FreeWhoisReportData): FreeWhoisReport {
  const created_at = data.created_at?.trim() || new Date().toISOString();
  const seed = `wl-${created_at}-${(data.email || "").toLowerCase()}`;
  const registryId = generateLirId(seed);

  let solarSegmentName = "—";
  let archetypeClassification = data.preview_archetype?.trim() ?? "—";

  let sunLongitudeDeg: number | null | undefined;
  let solarAnchorType: string | undefined;
  let seasonalPolarity: string | undefined;

  const rawBirthDate = data.birthDate?.trim().slice(0, 10);
  if (rawBirthDate) {
    const lon = approximateSunLongitudeFromDate(rawBirthDate);
    if (lon != null) {
      const seasonIndex = getSolarSeasonIndexFromLongitude(lon);
      const name = CANONICAL_SOLAR_SEGMENT_NAMES[seasonIndex];
      if (name) solarSegmentName = name;
      archetypeClassification = getPrimaryArchetypeFromSolarLongitude(lon);
      sunLongitudeDeg = lon;
      const seasonEntry = getSolarSeasonByIndex(seasonIndex);
      solarAnchorType = seasonEntry?.anchorType;
      const normalized = ((lon % 360) + 360) % 360;
      seasonalPolarity = normalized >= 0 && normalized < 180 ? "waxing" : "waning";
    }
  }

  const archForCosmic: LigsArchetype =
    archetypeClassification && archetypeClassification !== "—"
      ? (archetypeClassification as LigsArchetype)
      : "Ignispectrum";
  const cosmicAnalogue = getCosmicAnalogue(archForCosmic).phenomenon;

  const report: FreeWhoisReport = {
    registryId,
    registryStatus: "Registered",
    created_at,
    recordAuthority: "LIGS Human WHOIS Registry",
    name: data.name?.trim() ?? "—",
    birthDate: data.birthDate?.trim() ?? "—",
    birthLocation: data.birthPlace?.trim() ?? "—",
    birthTime: data.birthTime?.trim() ?? "—",
    solarSignature: solarSegmentName,
    archetypeClassification,
    cosmicAnalogue,
  };
  if (sunLongitudeDeg != null) report.sunLongitudeDeg = sunLongitudeDeg;
  if (solarAnchorType != null) report.solarAnchorType = solarAnchorType;
  if (data.protocol) report.protocol = data.protocol;
  return report;
}

/** Parameters for building a paid WHOIS report from stored report + Beauty profile. */
export interface BuildPaidWhoisReportParams {
  reportId: string;
  /** When provided, originCoordinatesDisplay is set for the Genesis table. */
  birthContext?: BirthContextForReport;
  /** Optional birth date (YYYY-MM-DD) for chrono resolution and solar fallback. */
  birthDate?: string;
  /** Optional birth time for chrono resolution. */
  birthTime?: string;
  /** Optional birth location for chrono resolution. */
  birthLocation?: string;
  /** Request id for profile load logging; default "paid-whois". */
  requestId?: string;
}

/**
 * Build a FreeWhoisReport for paid WHOIS: loads stored report and Beauty profile,
 * populates base WHOIS fields and optional paid section bodies from full_report / profile / vector_zero.
 * Returns the same FreeWhoisReport type so the existing WHOIS renderer produces the full paid report.
 * Does not change free preview or card behavior.
 */
export async function buildPaidWhoisReport(
  params: BuildPaidWhoisReportParams
): Promise<FreeWhoisReport> {
  const { reportId, birthContext, birthDate, birthTime, birthLocation, requestId = "paid-whois" } = params;

  const [storedReport, profile] = await Promise.all([
    getReport(reportId),
    loadBeautyProfileV1(reportId, requestId),
  ]);

  if (!storedReport) {
    throw new Error("PAID_WHOIS_REPORT_NOT_FOUND");
  }

  const fullReport = storedReport.full_report ?? "";
  const createdAt = storedReport.createdAt != null ? new Date(storedReport.createdAt).toISOString() : new Date().toISOString();
  const seed = `paid-${reportId}-${createdAt}`;
  const registryId = generateLirId(seed);

  const name = profile.subjectName?.trim() ?? "—";
  const birthDateStr = (birthDate?.trim() ?? profile.birthDate?.trim()) ?? "—";
  const birthLocationStr = (birthLocation?.trim() ?? profile.birthLocation?.trim()) ?? "—";
  const birthTimeStr = (birthTime?.trim() ?? profile.birthTime?.trim()) ?? "—";

  let solarSegmentName = "—";
  let archetypeClassification = profile.dominantArchetype?.trim() ?? "—";
  let sunLongitudeDeg: number | null | undefined;
  let solarAnchorType: string | undefined;
  let seasonalPolarity: string | undefined;

  const solarProfile = profile.solarSeasonProfile;
  if (solarProfile != null) {
    const entry = getSolarSeasonByIndex(solarProfile.seasonIndex);
    if (entry) {
      solarSegmentName = CANONICAL_SOLAR_SEGMENT_NAMES[solarProfile.seasonIndex] ?? solarProfile.archetype ?? "—";
      archetypeClassification = solarProfile.archetype ?? profile.dominantArchetype ?? "—";
      sunLongitudeDeg = solarProfile.lonCenterDeg;
      solarAnchorType = entry.anchorType;
      seasonalPolarity = solarProfile.seasonalPolarity;
    }
  }
  if (sunLongitudeDeg == null && birthDateStr && birthDateStr !== "—") {
    const rawDate = birthDateStr.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const lon = approximateSunLongitudeFromDate(rawDate);
      if (lon != null) {
        const seasonIndex = getSolarSeasonIndexFromLongitude(lon);
        const nameSeg = CANONICAL_SOLAR_SEGMENT_NAMES[seasonIndex];
        if (nameSeg) solarSegmentName = nameSeg;
        archetypeClassification = getPrimaryArchetypeFromSolarLongitude(lon);
        sunLongitudeDeg = lon;
        const seasonEntry = getSolarSeasonByIndex(seasonIndex);
        solarAnchorType = seasonEntry?.anchorType;
        const normalized = ((lon % 360) + 360) % 360;
        seasonalPolarity = normalized >= 0 && normalized < 180 ? "waxing" : "waning";
      }
    }
  }

  const archForCosmic: LigsArchetype =
    archetypeClassification && archetypeClassification !== "—"
      ? (archetypeClassification as LigsArchetype)
      : "Ignispectrum";
  const cosmicAnalogue = getCosmicAnalogue(archForCosmic).phenomenon;

  const report: FreeWhoisReport = {
    registryId,
    registryStatus: "Registered",
    created_at: createdAt,
    recordAuthority: "LIGS Human WHOIS Registry",
    name,
    birthDate: birthDateStr,
    birthLocation: birthLocationStr,
    birthTime: birthTimeStr,
    solarSignature: solarSegmentName,
    archetypeClassification,
    cosmicAnalogue,
  };
  if (sunLongitudeDeg != null) report.sunLongitudeDeg = sunLongitudeDeg;
  if (solarAnchorType != null) report.solarAnchorType = solarAnchorType;
  if (seasonalPolarity != null) report.seasonalPolarity = seasonalPolarity;
  if (profile.protocol) report.protocol = profile.protocol;

  if (
    birthDateStr !== "—" &&
    birthTimeStr !== "—" &&
    birthLocationStr !== "—" &&
    birthTimeStr.trim() &&
    birthLocationStr.trim()
  ) {
    try {
      const resolved = await resolveChronoImprintDisplay(
        birthDateStr,
        birthTimeStr,
        birthLocationStr
      );
      if (resolved) report.chronoImprintResolved = resolved;
    } catch {
      // keep Chrono-Imprint display as-is
    }
  }

  if (birthContext != null) {
    report.originCoordinatesDisplay = formatOriginCoordinatesDisplay(birthContext);
  } else if (profile.originCoordinatesDisplay != null && String(profile.originCoordinatesDisplay).trim() !== "") {
    report.originCoordinatesDisplay = profile.originCoordinatesDisplay.trim();
  } else if (storedReport.originCoordinatesDisplay != null && String(storedReport.originCoordinatesDisplay).trim() !== "") {
    report.originCoordinatesDisplay = storedReport.originCoordinatesDisplay.trim();
  }

  if (storedReport.magneticFieldIndexDisplay != null && String(storedReport.magneticFieldIndexDisplay).trim() !== "") {
    report.magneticFieldIndexDisplay = storedReport.magneticFieldIndexDisplay.trim();
  }
  if (storedReport.climateSignatureDisplay != null && String(storedReport.climateSignatureDisplay).trim() !== "") {
    report.climateSignatureDisplay = storedReport.climateSignatureDisplay.trim();
  }
  if (storedReport.sensoryFieldConditionsDisplay != null && String(storedReport.sensoryFieldConditionsDisplay).trim() !== "") {
    report.sensoryFieldConditionsDisplay = storedReport.sensoryFieldConditionsDisplay.trim();
  }

  const v0 = storedReport.vector_zero ?? profile.vector_zero;
  const threeVoice = v0?.three_voice;
  if (threeVoice) {
    const addendum = formatVectorZeroThreeVoice(threeVoice);
    if (addendum) report.vectorZeroAddendumBody = addendum;
  }

  const s1 = parseSectionBody(fullReport, 1);
  const s2 = parseSectionBody(fullReport, 2);
  const s6 = parseSectionBody(fullReport, 6);
  const s7 = parseSectionBody(fullReport, 7);
  const s11 = parseSectionBody(fullReport, 11);
  const s12to14 = parseSectionRange(fullReport, 12, 14);
  const s2to5 = parseSectionRange(fullReport, 2, 5);

  if (s1 || s2) {
    const combined = [s1, s2].filter(Boolean).join("\n\n");
    if (combined.trim()) {
      report.identityArchitectureBody = combined.trim();
    } else {
      report.identityArchitectureBody = FREE_TIER_IDENTITY_ARCHITECTURE;
      log("warn", "paid_whois_section_parse_fallback", { reportId, requestId, section: "identityArchitectureBody", reason: "s1+s2 empty after trim" });
    }
  } else {
    report.identityArchitectureBody = FREE_TIER_IDENTITY_ARCHITECTURE;
    log("warn", "paid_whois_section_parse_fallback", { reportId, requestId, section: "identityArchitectureBody", reason: "s1 and s2 both null" });
  }
  if (storedReport.field_conditions_context != null) {
    report.fieldConditionsBody = formatFieldConditionsContextForWhois(storedReport.field_conditions_context);
  } else if (s2to5) {
    report.fieldConditionsBody = s2to5;
  } else {
    report.fieldConditionsBody = FREE_TIER_FIELD_CONDITIONS;
    log("warn", "paid_whois_section_parse_fallback", { reportId, requestId, section: "fieldConditionsBody", reason: "field_conditions_context and s2to5 both null" });
  }
  if (s11) {
    report.cosmicTwinBody = s11;
  } else {
    const composed = composeCosmicTwin({ dominantArchetype: archetypeClassification });
    if (composed.length > 0) {
      report.cosmicTwinBody = composed.join(" ");
    }
  }
  if (s6 || s7) {
    const combined = [s6, s7].filter(Boolean).join("\n\n");
    if (combined.trim()) report.archetypeExpressionBody = combined.trim();
  } else {
    const composed = composeArchetypeSummary({ dominantArchetype: archetypeClassification });
    if (composed.length > 0) {
      report.archetypeExpressionBody = composed.join(" ");
    }
  }
  if (s12to14) {
    report.interpretiveNotesBody = s12to14;
  } else {
    report.interpretiveNotesBody = FREE_TIER_INTERPRETIVE_NOTES;
    log("warn", "paid_whois_section_parse_fallback", { reportId, requestId, section: "interpretiveNotesBody", reason: "s12to14 null" });
  }

  const composedCivilizational = composeCivilizationalFunctionSection({ dominantArchetype: archetypeClassification });
  report.civilizationalFunctionBody =
    composedCivilizational && composedCivilizational.trim() !== ""
      ? composedCivilizational
      : FREE_TIER_CIVILIZATIONAL_FUNCTION;
  report.integrationNoteBody = INTEGRATION_NOTE_DEFAULT;

  return report;
}

const MONO_LIGHT =
  "font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:12px;color:#1a1a1a;line-height:1.5;";
const MONO_DARK =
  "font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:12px;color:rgba(255,255,255,0.75);line-height:1.5;";

function row(label: string, value: string, theme: "light" | "dark"): string {
  if (theme === "dark") {
    return `    <tr><td style="padding:6px 12px 6px 0;vertical-align:top;${MONO_DARK}color:rgba(255,255,255,0.55);">${escapeHtml(label)}</td><td style="padding:6px 0;${MONO_DARK}">${escapeHtml(value)}</td></tr>`;
  }
  return `    <tr><td style="padding:2px 10px 2px 0;vertical-align:top;${MONO_LIGHT}">${escapeHtml(label)}</td><td style="padding:2px 0;${MONO_LIGHT}color:#333;">${escapeHtml(value)}</td></tr>`;
}

/**
 * Render the free WHOIS report as HTML. Same artifact for email and landing.
 * theme: "light" (default) for email; "dark" for /whois/view to match whois-your-human.
 */
export function renderFreeWhoisReport(
  report: FreeWhoisReport,
  options?: { siteUrl?: string; theme?: "light" | "dark" }
): string {
  const theme = options?.theme ?? "light";
  const siteUrl = (options?.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, "");
  const logoUrl = `${siteUrl}/brand/logo.svg`;

  const archetypeForFallback = report.archetypeClassification?.trim() || "Ignispectrum";
  const staticFallbackPath = getArchetypeStaticImagePathOrFallback(archetypeForFallback);
  const fallbackImgUrl = `${siteUrl}${staticFallbackPath}`;

  const primaryUrl = report.artifactImageUrl?.trim();
  const useFallback = !primaryUrl || primaryUrl.length === 0;
  const imgUrl = useFallback ? fallbackImgUrl : primaryUrl;

  log("info", "whois_view_artifact_image_resolved", {
    reportId: report.registryId,
    archetypeClassification: report.archetypeClassification ?? "(none)",
    archetypeForFallback,
    useFallback,
    finalUrl: imgUrl.slice(0, 80) + (imgUrl.length > 80 ? "…" : ""),
  });

  const createdDateDisplay = report.created_at.slice(0, 10);

  const registrationLogRows = [
    row("Registry Status", report.registryStatus, theme),
    row("Created Date", createdDateDisplay, theme),
    row("Record Authority", report.recordAuthority, theme),
    row("Registry ID", report.registryId, theme),
  ].join("\n");

  const recordRows = [
    row("Subject Name", report.name, theme),
    row("Birth Date", report.birthDate, theme),
    row("Birth Location", report.birthLocation, theme),
    row("Birth Time", report.birthTime, theme),
    row("Solar Segment", report.solarSignature, theme),
    row("Archetype Classification", report.archetypeClassification, theme),
    row("Cosmic Twin", report.cosmicAnalogue, theme),
  ].join("\n");

  const solarLightVector =
    report.sunLongitudeDeg != null && Number.isFinite(report.sunLongitudeDeg)
      ? formatSolarLongitudeDisplay(report.sunLongitudeDeg)
      : "Limited Access";
  const seasonalContext =
    report.solarSignature && report.solarSignature !== "—" ? report.solarSignature : "Limited Access";
  const solarAnchorTypeDisplay = humanizeSolarAnchorType(report.solarAnchorType);
  const chronoImprint =
    report.chronoImprintResolved ?? chronoImprintDisplay(report.birthTime);
  const originCoordinates = report.originCoordinatesDisplay ?? "Restricted Node Data";
  const magneticFieldIndex = report.magneticFieldIndexDisplay ?? "Restricted Node Data";
  const climateSignature = report.climateSignatureDisplay ?? "Restricted Node Data";
  const sensoryFieldConditions = report.sensoryFieldConditionsDisplay ?? "Restricted Node Data";
  const genesisRows = [
    row("Solar Light Vector", solarLightVector, theme),
    row("Seasonal Context", seasonalContext, theme),
    row("Solar Anchor Type", solarAnchorTypeDisplay, theme),
    row("Chrono-Imprint", chronoImprint, theme),
    row("Origin Coordinates", originCoordinates, theme),
    row("Magnetic Field Index", magneticFieldIndex, theme),
    row("Climate Signature", climateSignature, theme),
    row("Sensory Field Conditions", sensoryFieldConditions, theme),
  ].join("\n");

  const artifactBlock = `
    <div style="margin:28px 0;text-align:center;">
      <img src="${escapeHtml(imgUrl)}" alt="Registry artifact" width="400" height="400" data-fallback="${escapeHtml(fallbackImgUrl)}" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:6px;${theme === "dark" ? "border:1px solid rgba(255,255,255,0.08);" : ""}" onerror="var f=this.dataset.fallback;if(f){this.onerror=null;this.src=f}" />
    </div>`;

  const vectorZeroRotation =
    typeof report.vectorZeroRotationIndex === "number"
      ? report.vectorZeroRotationIndex
      : (report.registryId || report.created_at);
  const vectorZeroImageUrl = getVectorZeroImageUrl(report.archetypeClassification, siteUrl, vectorZeroRotation);
  const vectorZeroImageBlock =
    vectorZeroImageUrl
      ? `<div style="margin:20px 0;text-align:center;"><img src="${escapeHtml(vectorZeroImageUrl)}" alt="Vector Zero" width="400" height="400" style="max-width:100%;height:auto;display:block;margin:0 auto;" /></div>`
      : "";

  const sectionHeading =
    theme === "dark"
      ? "margin:0 0 8px 0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(52,211,153,0.85);font-family:ui-monospace,'SF Mono',Consolas,monospace;"
      : "margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#1a1a1a;";
  const sectionBody =
    theme === "dark"
      ? "margin:0 0 16px 0;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5;"
      : "margin:0 0 16px 0;font-size:13px;color:#333;line-height:1.5;";
  const bodyBg = theme === "dark" ? "#050508" : "#fff";
  const bodyColor = theme === "dark" ? "rgba(255,255,255,0.75)" : "#1a1a1a";
  const borderColor = theme === "dark" ? "rgba(255,255,255,0.1)" : "#e0e0e0";
  const cardBlock = theme === "dark"
    ? "margin-bottom:20px;padding:16px 20px;border:1px solid rgba(255,255,255,0.1);border-radius:6px;background:rgba(0,0,0,0.5);"
    : "";

  const identityArchitecture = resolveSectionContent(
    report.identityArchitectureBody,
    FREE_TIER_IDENTITY_ARCHITECTURE
  );
  const fieldConditions = resolveSectionContent(
    report.fieldConditionsBody,
    FREE_TIER_FIELD_CONDITIONS
  );
  const cosmicTwinSection =
    report.cosmicTwinBody != null && String(report.cosmicTwinBody).trim() !== ""
      ? report.cosmicTwinBody.trim()
      : `Cosmic Twin: ${report.cosmicAnalogue}`;
  const archetypeExpressionSection =
    report.archetypeExpressionBody != null && String(report.archetypeExpressionBody).trim() !== ""
      ? report.archetypeExpressionBody.trim()
      : `Archetype Classification: ${report.archetypeClassification}`;
  const interpretiveNotes = resolveSectionContent(
    report.interpretiveNotesBody,
    FREE_TIER_INTERPRETIVE_NOTES
  );
  const civilizationalFunction = resolveSectionContent(
    report.civilizationalFunctionBody,
    FREE_TIER_CIVILIZATIONAL_FUNCTION
  );
  const integrationNote =
    report.integrationNoteBody != null && String(report.integrationNoteBody).trim() !== ""
      ? report.integrationNoteBody.trim()
      : INTEGRATION_NOTE_DEFAULT;
  const vectorZeroIntro = resolveSectionContent(
    report.vectorZeroAddendumBody,
    FREE_TIER_VECTOR_ZERO_ADDENDUM
  );

  const h1Color = theme === "dark" ? "rgba(255,255,255,0.9)" : "#1a1a1a";
  const subColor = theme === "dark" ? "rgba(255,255,255,0.55)" : "#444";
  const linkColor = theme === "dark" ? "rgba(52,211,153,0.9)" : "#1a1a1a";
  const footerColor = theme === "dark" ? "rgba(255,255,255,0.45)" : "#666";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Registry Record — LIGS Human WHOIS</title>
</head>
<body style="margin:0;padding:0;background:${bodyBg};font-family:${theme === "dark" ? "ui-monospace,'SF Mono',Consolas,monospace" : "Georgia,serif"};color:${bodyColor};line-height:1.5;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <header style="border-bottom:1px solid ${borderColor};padding-bottom:16px;margin-bottom:24px;">
      <div style="margin-bottom:12px;">
        <img src="${escapeHtml(logoUrl)}" alt="LIGS" width="80" height="40" style="display:block;height:40px;width:auto;" />
      </div>
      <h1 style="margin:0;font-size:14px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${h1Color};">LIGS HUMAN WHOIS</h1>
      <p style="margin:6px 0 0 0;font-size:12px;color:${subColor};">Identity registration record</p>
    </header>

    <div style="${cardBlock}">
    <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;${theme === "dark" ? "color:rgba(52,211,153,0.85);" : "color:#1a1a1a;"}">Who this is</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:${theme === "dark" ? "0" : "24px"};" cellpadding="0" cellspacing="0">
${recordRows}
    </table>
    </div>

${artifactBlock || ""}
${report.protocol
  ? (() => {
      const protoFmt = formatProtocolForDisplay(report.protocol!);
      return `
    <div style="${cardBlock}">
    <p style="${sectionHeading}">WHOIS PROTOCOL</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:${theme === "dark" ? "0" : "24px"};" cellpadding="0" cellspacing="0">
      ${row("Cognitive Rhythm", protoFmt.cognitive_rhythm, theme)}
      ${row("Decision Geometry", protoFmt.decision_geometry, theme)}
      ${row("Friction Points", report.protocol!.friction_points, theme)}
      ${row("Interaction Ritual", report.protocol!.interaction_ritual, theme)}
      ${row("Contribution Mode", protoFmt.contribution_mode, theme)}
      ${row("Drift Signature", report.protocol!.drift_signature, theme)}
      ${row("Coherence Signature", report.protocol!.coherence_signature, theme)}
    </table>
    </div>
    ${report.protocol.agent_directives ? (() => {
      const formatted = getAgentDirectivesDisplayStrings(report.protocol!.agent_directives!);
      return `
    <div style="${cardBlock}">
    <p style="${sectionHeading}">AGENT DIRECTIVES</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:${theme === "dark" ? "0" : "24px"};" cellpadding="0" cellspacing="0">
      ${row("Response Style", formatted.response_style, theme)}
      ${row("Pacing", formatted.pacing, theme)}
      ${row("Structure Rules", formatted.structure_rules, theme)}
      ${row("Decision Presentation", formatted.decision_presentation, theme)}
      ${row("Intervention Triggers", formatted.intervention_triggers, theme)}
    </table>
    </div>
    `;
    })() : ""}
`;
  })() : ""}

    <div style="${cardBlock}">
    <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;${theme === "dark" ? "color:rgba(255,255,255,0.55);" : "color:#1a1a1a;"}">${theme === "dark" ? "Supporting metadata" : "Registry detail"}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:${theme === "dark" ? "0" : "24px"};" cellpadding="0" cellspacing="0">
${registrationLogRows}
    </table>
    </div>

    <div style="${cardBlock}">
    <p style="${sectionHeading}">${theme === "dark" ? "GENESIS METADATA" : "IDENTITY PHYSICS — GENESIS METADATA"}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:${theme === "dark" ? "0" : "24px"};" cellpadding="0" cellspacing="0">
${genesisRows}
    </table>
    </div>

    ${theme === "light" ? '<p style="margin:0 0 24px 0;font-size:14px;color:#333;">This document constitutes the official registry record for the identity designated above.</p>' : ""}

    <p style="${sectionHeading}">IDENTITY ARCHITECTURE</p>
    <p style="${sectionBody}">${escapeHtml(identityArchitecture)}</p>

    <p style="${sectionHeading}">FIELD CONDITIONS</p>
    <p style="${sectionBody}">${escapeHtml(fieldConditions)}</p>

    <p style="${sectionHeading}">COSMIC TWIN RELATION</p>
    <p style="${sectionBody}">${escapeHtml(cosmicTwinSection)}</p>

    <p style="${sectionHeading}">ARCHETYPE EXPRESSION</p>
    <p style="${sectionBody}">${escapeHtml(archetypeExpressionSection)}</p>

    <p style="${sectionHeading}">CIVILIZATIONAL FUNCTION</p>
    <p style="${sectionBody};white-space:pre-line;">${escapeHtml(civilizationalFunction)}</p>

    <p style="${sectionHeading}">INTERPRETIVE NOTES</p>
    <p style="${sectionBody}">${escapeHtml(interpretiveNotes)}</p>

    <p style="${sectionHeading}">INTEGRATION NOTE</p>
    <p style="${sectionBody};white-space:pre-line;">${escapeHtml(integrationNote)}</p>

    <p style="margin:24px 0 0 0;font-size:13px;">
      <a href="${escapeHtml(siteUrl)}/whois-your-human" style="color:${linkColor};text-decoration:underline;">Return to WHOIS YOUR HUMAN</a>
    </p>

    <footer style="margin-top:40px;padding-top:16px;border-top:1px solid ${borderColor};font-size:11px;color:${footerColor};">
      <p style="margin:0;">LIGS Systems</p>
      <p style="margin:4px 0 0 0;">${theme === "dark" ? "Human WHOIS protocol surface." : "Issued by LIGS Human Identity Registry."}</p>
    </footer>

    <div style="margin-top:32px;padding-top:24px;border-top:1px solid ${borderColor};">
      <p style="${sectionHeading}">${theme === "dark" ? "VECTOR ZERO" : "OFFICIAL REGISTRY ADDENDUM — VECTOR ZERO"}</p>
      <p style="${sectionBody}">${escapeHtml(vectorZeroIntro)}</p>
      <p style="${sectionBody}">Archetype Classification: ${escapeHtml(report.archetypeClassification)}</p>
      ${vectorZeroImageBlock}
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Plain-text version of the free WHOIS report (for email multipart).
 */
export function renderFreeWhoisReportText(
  report: FreeWhoisReport,
  options?: { siteUrl?: string }
): string {
  const siteUrl = (options?.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, "");
  const createdDateDisplay = report.created_at.slice(0, 10);
  const lines: string[] = [
    "LIGS HUMAN WHOIS REGISTRY",
    "Identity Registration Record",
    "",
    "REGISTRATION LOG",
    "",
    "Registry Status: " + report.registryStatus,
    "Created Date: " + createdDateDisplay,
    "Record Authority: " + report.recordAuthority,
    "Registry ID: " + report.registryId,
    "",
    "Human WHOIS Registry Record",
    "",
    "Subject Name: " + report.name,
    "Birth Date: " + report.birthDate,
    "Birth Location: " + report.birthLocation,
    "Birth Time: " + report.birthTime,
    "Solar Segment: " + report.solarSignature,
    "Archetype Classification: " + report.archetypeClassification,
    "Cosmic Twin: " + report.cosmicAnalogue,
    "",
    "IDENTITY PHYSICS — GENESIS METADATA",
    "",
    "Solar Light Vector: " +
      (report.sunLongitudeDeg != null && Number.isFinite(report.sunLongitudeDeg)
        ? formatSolarLongitudeDisplay(report.sunLongitudeDeg)
        : "Limited Access"),
    "Seasonal Context: " +
      (report.solarSignature && report.solarSignature !== "—" ? report.solarSignature : "Limited Access"),
    "Solar Anchor Type: " + humanizeSolarAnchorType(report.solarAnchorType),
    "Chrono-Imprint: " + (report.chronoImprintResolved ?? chronoImprintDisplay(report.birthTime)),
    "Origin Coordinates: " + (report.originCoordinatesDisplay ?? "Restricted Node Data"),
    "Magnetic Field Index: " + (report.magneticFieldIndexDisplay ?? "Restricted Node Data"),
    "Climate Signature: " + (report.climateSignatureDisplay ?? "Restricted Node Data"),
    "Sensory Field Conditions: " + (report.sensoryFieldConditionsDisplay ?? "Restricted Node Data"),
    "",
    "This document constitutes the official registry record for the identity designated above.",
    "",
    ...(report.protocol
      ? (() => {
          const protoFmt = formatProtocolForDisplay(report.protocol!);
          return [
            "WHOIS PROTOCOL — PRIMARY SURFACE",
            "",
            "Cognitive Rhythm: " + protoFmt.cognitive_rhythm,
            "Decision Geometry: " + protoFmt.decision_geometry,
            "Friction Points: " + report.protocol!.friction_points,
            "Interaction Ritual: " + report.protocol!.interaction_ritual,
            "Contribution Mode: " + protoFmt.contribution_mode,
            "Drift Signature: " + report.protocol!.drift_signature,
            "Coherence Signature: " + report.protocol!.coherence_signature,
            "",
          ...(report.protocol.agent_directives
            ? (() => {
                const formatted = getAgentDirectivesDisplayStrings(report.protocol!.agent_directives!);
                return [
                  "AGENT DIRECTIVES",
                  "",
                  "Response Style: " + formatted.response_style,
                  "Pacing: " + formatted.pacing,
                  "Structure Rules: " + formatted.structure_rules,
                  "Decision Presentation: " + formatted.decision_presentation,
                  "Intervention Triggers: " + formatted.intervention_triggers,
                  "",
                ];
              })()
            : []),
          ];
        })()
      : []),
    "IDENTITY ARCHITECTURE",
    resolveSectionContent(report.identityArchitectureBody, FREE_TIER_IDENTITY_ARCHITECTURE),
    "",
    "FIELD CONDITIONS",
    resolveSectionContent(report.fieldConditionsBody, FREE_TIER_FIELD_CONDITIONS),
    "",
    "COSMIC TWIN RELATION",
    report.cosmicTwinBody != null && String(report.cosmicTwinBody).trim() !== ""
      ? report.cosmicTwinBody.trim()
      : "Cosmic Twin: " + report.cosmicAnalogue,
    "",
    "ARCHETYPE EXPRESSION",
    report.archetypeExpressionBody != null && String(report.archetypeExpressionBody).trim() !== ""
      ? report.archetypeExpressionBody.trim()
      : "Archetype Classification: " + report.archetypeClassification,
    "",
    "CIVILIZATIONAL FUNCTION",
    "",
    resolveSectionContent(report.civilizationalFunctionBody, FREE_TIER_CIVILIZATIONAL_FUNCTION),
    "",
    "INTERPRETIVE NOTES",
    resolveSectionContent(report.interpretiveNotesBody, FREE_TIER_INTERPRETIVE_NOTES),
    "",
    "INTEGRATION NOTE",
    "",
    report.integrationNoteBody != null && String(report.integrationNoteBody).trim() !== ""
      ? report.integrationNoteBody.trim()
      : INTEGRATION_NOTE_DEFAULT,
    "",
    "Return to the registry: " + siteUrl,
    "",
    "LIGS Systems",
    "Issued by LIGS Human Identity Registry.",
    "",
    "OFFICIAL REGISTRY ADDENDUM — VECTOR ZERO",
    "",
    resolveSectionContent(report.vectorZeroAddendumBody, FREE_TIER_VECTOR_ZERO_ADDENDUM),
    "",
    "Archetype Classification: " + report.archetypeClassification,
    ...(getVectorZeroImageUrl(
      report.archetypeClassification,
      siteUrl,
      typeof report.vectorZeroRotationIndex === "number"
        ? report.vectorZeroRotationIndex
        : (report.registryId || report.created_at)
    )
      ? [
          "",
          "Vector Zero image: " +
            getVectorZeroImageUrl(
              report.archetypeClassification,
              siteUrl,
              typeof report.vectorZeroRotationIndex === "number"
                ? report.vectorZeroRotationIndex
                : (report.registryId || report.created_at)
            ),
        ]
      : []),
  ];
  return lines.join("\n");
}

/**
 * Preview display helper: canonical Genesis Metadata row labels/values and Cosmic Twin display value.
 * Additive only — does not change existing render logic. Used by on-site WHOIS preview to stay coherent with free WHOIS.
 * Same rules: ° solar longitude (2 decimals), humanized anchor type, chrono-imprint with optional override for preview.
 */
export interface FreeWhoisPreviewDisplayOptions {
  /** When report.birthTime is not usable, use this for Chrono-Imprint so preview matches registry block (e.g. formData.birthTime). */
  chronoImprintOverride?: string | null;
}

export interface FreeWhoisPreviewDisplay {
  genesisRows: Array<{ label: string; value: string }>;
  cosmicTwinDisplay: string | null;
}

export function getFreeWhoisPreviewDisplay(
  report: FreeWhoisReport | null | undefined,
  options?: FreeWhoisPreviewDisplayOptions
): FreeWhoisPreviewDisplay {
  if (report == null) {
    return { genesisRows: [], cosmicTwinDisplay: null };
  }
  const solarLightVector =
    report.sunLongitudeDeg != null && Number.isFinite(report.sunLongitudeDeg)
      ? formatSolarLongitudeDisplay(report.sunLongitudeDeg)
      : "Limited Access";
  const seasonalContext =
    report.solarSignature && report.solarSignature !== "—" ? report.solarSignature : "Limited Access";
  const solarAnchorTypeDisplay = humanizeSolarAnchorType(report.solarAnchorType);
  const chronoImprint =
    report.chronoImprintResolved ??
    chronoImprintDisplay(report.birthTime, options?.chronoImprintOverride);
  const genesisRows: Array<{ label: string; value: string }> = [
    { label: "Solar Light Vector", value: solarLightVector },
    { label: "Seasonal Context", value: seasonalContext },
    { label: "Solar Anchor Type", value: solarAnchorTypeDisplay },
    { label: "Chrono-Imprint", value: chronoImprint },
    { label: "Origin Coordinates", value: report.originCoordinatesDisplay ?? "Restricted Node Data" },
    { label: "Magnetic Field Index", value: report.magneticFieldIndexDisplay ?? "Restricted Node Data" },
    { label: "Climate Signature", value: report.climateSignatureDisplay ?? "Restricted Node Data" },
    { label: "Sensory Field Conditions", value: report.sensoryFieldConditionsDisplay ?? "Restricted Node Data" },
  ];
  const cosmicTwinDisplay =
    report.cosmicAnalogue && report.cosmicAnalogue.trim() ? report.cosmicAnalogue.trim() : null;
  return { genesisRows, cosmicTwinDisplay };
}

/** Archetype expression line and typical contexts for card identity block (same source as preview). */
function getArchetypeExpressionForCard(archetypeClassification: string): {
  expressionLine: string;
  typicalContexts: string | null;
} {
  try {
    const cfg = getArchetypePreviewConfig(archetypeClassification?.trim() ?? "");
    const teaser = cfg?.teaser ?? {};
    const humanExpression = (teaser as { humanExpression?: string }).humanExpression ?? "—";
    const civilizationFunction = (teaser as { civilizationFunction?: string }).civilizationFunction ?? "—";
    const environments = (teaser as { environments?: string }).environments ?? "—";
    const expressionLine =
      civilizationFunction && civilizationFunction !== "—"
        ? humanExpression && humanExpression !== "—"
          ? `${humanExpression} — ${civilizationFunction}`
          : civilizationFunction
        : "—";
    const typicalContexts =
      environments && typeof environments === "string" && environments !== "—"
        ? environments
        : null;
    return { expressionLine, typicalContexts };
  } catch {
    return { expressionLine: "—", typicalContexts: null };
  }
}

/**
 * Compact WHOIS Human Registration Card — registry-issued identity card for confirmation email.
 * Same report object and display helpers as preview/free WHOIS. Primary email body.
 *
 * STABLE — Do not modify casually. This renderer is the canonical registration artifact for waitlist
 * confirmation email. Structure must preserve, in order:
 * - Genesis Metadata
 * - Identity Signature
 * - Artifact placement
 * - Vector Zero addendum
 * - Section order
 */
export function renderFreeWhoisCard(
  report: FreeWhoisReport,
  options?: { siteUrl?: string }
): string {
  const siteUrl = (options?.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, "");
  const logoUrl = `${siteUrl}/brand/logo.svg`;
  const display = getFreeWhoisPreviewDisplay(report);
  const createdDateDisplay = report.created_at.slice(0, 10);
  const { expressionLine, typicalContexts } = getArchetypeExpressionForCard(report.archetypeClassification);
  const imgUrl =
    report.artifactImageUrl && report.artifactImageUrl.length > 0
      ? report.artifactImageUrl
      : "";

  const cardStyle =
    "max-width:420px;margin:0 auto;padding:20px 24px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:12px;color:#1a1a1a;line-height:1.4;";
  const labelStyle = "font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#666;padding:6px 8px 6px 0;vertical-align:top;";
  const valueStyle = "color:#1a1a1a;padding:6px 0;";
  const rowBorder = "border-bottom:1px solid #f0f0f0;";
  const sectionTitleStyle = "font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#1a1a1a;margin:14px 0 6px 0;";

  const coreRows = [
    ["Subject Name", report.name],
    ["Birth Date", report.birthDate],
    ["Birth Location", report.birthLocation],
    ["Birth Time", formatBirthTimeForCardDisplay(report.birthTime)],
    ["Solar Segment", report.solarSignature],
    ["Archetype Classification", report.archetypeClassification],
    ["Registry Status", report.registryStatus],
    ["Created Date", createdDateDisplay],
    ["Record Authority", report.recordAuthority],
  ]
    .map(
      ([l, v]) =>
        `<tr style="${rowBorder}"><td style="${labelStyle}">${escapeHtml(l)}</td><td style="${valueStyle}">${escapeHtml(v)}</td></tr>`
    )
    .join("");

  const genesisRowsHtml =
    display.genesisRows.length > 0
      ? display.genesisRows.map(
          (r) =>
            `<tr style="${rowBorder}"><td style="${labelStyle}">${escapeHtml(r.label)}</td><td style="${valueStyle}">${escapeHtml(r.value)}</td></tr>`
        ).join("")
      : "";

  const cosmicTwinValue = display.cosmicTwinDisplay ?? report.cosmicAnalogue ?? "—";
  const vectorZeroRotation =
    typeof report.vectorZeroRotationIndex === "number"
      ? report.vectorZeroRotationIndex
      : (report.registryId || report.created_at);
  const vectorZeroImageUrl = getVectorZeroImageUrl(report.archetypeClassification, siteUrl, vectorZeroRotation);
  const vectorZeroImageBlock =
    vectorZeroImageUrl
      ? `<div style="margin:20px 0;text-align:center;"><img src="${escapeHtml(vectorZeroImageUrl)}" alt="" width="400" height="400" style="max-width:100%;height:auto;display:block;margin:0 auto;" /></div>`
      : "";
  const identityParts: string[] = [
    `<p style="margin:0 0 6px 0;font-size:12px;">Cosmic Twin: ${escapeHtml(cosmicTwinValue)}</p>`,
    `<p style="margin:0 0 6px 0;font-size:12px;">Archetype Classification: ${escapeHtml(report.archetypeClassification)}</p>`,
  ];
  if (expressionLine && expressionLine !== "—") {
    identityParts.push(`<p style="margin:0 0 4px 0;font-size:12px;">${escapeHtml(expressionLine)}</p>`);
  }
  if (typicalContexts) {
    identityParts.push(
      `<p style="margin:0;font-size:11px;color:#444;">Typical expression contexts: ${escapeHtml(typicalContexts)}</p>`
    );
  }

  const artifactBlock =
    imgUrl &&
    `<div style="margin:24px 0 16px 0;text-align:center;"><img src="${escapeHtml(imgUrl)}" alt="Registry Artifact" width="280" height="280" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:4px;" /></div>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WHOIS Human Registration Card</title></head>
<body style="margin:0;padding:24px 16px;background:#f5f5f5;font-family:Georgia,serif;">
  <div style="${cardStyle}">
    <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e8e8e8;">
      <img src="${escapeHtml(logoUrl)}" alt="LIGS" width="64" height="32" style="display:block;height:32px;width:auto;" />
      <p style="margin:8px 0 0 0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#1a1a1a;">WHOIS Human Registration Card</p>
      <p style="margin:2px 0 0 0;font-size:10px;color:#666;">LIGS Human WHOIS Registry</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px;" cellpadding="0" cellspacing="0">
${coreRows}
    </table>
    ${genesisRowsHtml ? `<div style="margin-top:20px;"><p style="${sectionTitleStyle}">Identity Physics — Genesis Metadata</p><table style="width:100%;border-collapse:collapse;font-size:11px;" cellpadding="0" cellspacing="0">${genesisRowsHtml}</table></div>` : ""}
    <div style="margin-top:24px;">
      <p style="${sectionTitleStyle}">Identity Signature</p>
      <div style="margin-top:10px;margin-bottom:4px;">${identityParts.join("")}</div>
    </div>
    ${artifactBlock || ""}
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid #e0e0e0;">
      <p style="${sectionTitleStyle}">Official Registry Addendum — Vector Zero</p>
      <p style="margin:0 0 12px 0;font-size:12px;color:#333;line-height:1.5;">As an early registry participant, your WHOIS record has been expanded with an additional section now cleared for release: Vector Zero.</p>
      <p style="margin:0 0 12px 0;font-size:12px;color:#333;line-height:1.5;">Vector Zero is the structural origin point of the archetype. It represents the directional bias the identity system takes when interacting with the world. In LIGS, Vector Zero marks the starting geometry from which behavior, coherence, and environmental interaction unfold.</p>
      <p style="margin:0 0 12px 0;font-size:12px;color:#333;">Archetype Classification: ${escapeHtml(report.archetypeClassification)}</p>
      ${vectorZeroImageBlock}
    </div>
    <p style="margin:16px 0 0 0;padding-top:12px;border-top:1px solid #e8e8e8;font-size:10px;color:#666;">Registry-issued. Identity registered.</p>
    <p style="margin:6px 0 0 0;font-size:11px;"><a href="${escapeHtml(siteUrl)}" style="color:#1a1a1a;text-decoration:underline;">Return to the registry</a></p>
  </div>
</body>
</html>`.trim();
}

/**
 * Plain-text version of the registration card (for email multipart).
 */
export function renderFreeWhoisCardText(
  report: FreeWhoisReport,
  options?: { siteUrl?: string }
): string {
  const siteUrl = (options?.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, "");
  const display = getFreeWhoisPreviewDisplay(report);
  const createdDateDisplay = report.created_at.slice(0, 10);
  const { expressionLine, typicalContexts } = getArchetypeExpressionForCard(report.archetypeClassification);
  const cosmicTwinValue = display.cosmicTwinDisplay ?? report.cosmicAnalogue ?? "—";

  const lines: string[] = [
    "WHOIS HUMAN REGISTRATION CARD",
    "LIGS Human WHOIS Registry",
    "",
    "Subject Name: " + report.name,
    "Birth Date: " + report.birthDate,
    "Birth Location: " + report.birthLocation,
    "Birth Time: " + formatBirthTimeForCardDisplay(report.birthTime),
    "Solar Segment: " + report.solarSignature,
    "Archetype Classification: " + report.archetypeClassification,
    "Registry Status: " + report.registryStatus,
    "Created Date: " + createdDateDisplay,
    "Record Authority: " + report.recordAuthority,
    "",
  ];
  if (display.genesisRows.length > 0) {
    lines.push("IDENTITY PHYSICS — GENESIS METADATA", "");
    for (const r of display.genesisRows) {
      lines.push(r.label + ": " + r.value);
    }
    lines.push("", "");
  }
  lines.push(
    "IDENTITY SIGNATURE",
    "",
    "Cosmic Twin: " + cosmicTwinValue,
    "Archetype Classification: " + report.archetypeClassification
  );
  if (expressionLine && expressionLine !== "—") lines.push(expressionLine);
  if (typicalContexts) lines.push("Typical expression contexts: " + typicalContexts);
  const vectorZeroRotation =
    typeof report.vectorZeroRotationIndex === "number"
      ? report.vectorZeroRotationIndex
      : (report.registryId || report.created_at);
  const vectorZeroImgUrl = getVectorZeroImageUrl(report.archetypeClassification, siteUrl, vectorZeroRotation);
  lines.push(
    "",
    "OFFICIAL REGISTRY ADDENDUM — VECTOR ZERO",
    "",
    "As an early registry participant, your WHOIS record has been expanded with an additional section now cleared for release: Vector Zero.",
    "",
    "Vector Zero is the structural origin point of the archetype. It represents the directional bias the identity system takes when interacting with the world. In LIGS, Vector Zero marks the starting geometry from which behavior, coherence, and environmental interaction unfold.",
    "",
    "Archetype Classification: " + report.archetypeClassification
  );
  if (vectorZeroImgUrl) lines.push("", "Vector Zero image: " + vectorZeroImgUrl);
  lines.push(
    "",
    "Registry-issued. Identity registered.",
    "",
    "Return to the registry: " + siteUrl
  );
  return lines.join("\n");
}
