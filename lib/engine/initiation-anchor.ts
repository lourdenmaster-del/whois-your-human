/**
 * Subject-name anchoring for INITIATION section.
 * Section-aware parsing and deterministic injection. Subject name is required input.
 *
 * LOCKDOWN: Full birth anchoring sentence is a HARD INVARIANT. INITIATION must contain
 * name + location + date + "was born in" + "Earth rotated beneath". No partial matches.
 */

export interface SubjectInput {
  fullName: string;
  birthDate: string;
  birthLocation: string;
}

export interface InitiationParseResult {
  /** Whether section 1 (INITIATION) was found */
  initiationFound: boolean;
  /** Start index of section 1 content (after heading) */
  contentStart: number;
  /** End index of section 1 (start of section 2 or end of report) */
  contentEnd: number;
  /** Section 1 content (heading + body) */
  sectionContent: string;
  /** Section 2 start index, or -1 if not found */
  section2Start: number;
}

/** Section boundary: "N. Title" — optional leading # (e.g. ## 1. INITIATION), flexible spacing and case */
const SECTION_HEADING_RE = /(?:\n|^)(\s*)(#+\s*)?(\d+)\.\s*([^\n]+)/g;

/** Fallback: "Section 1: Initiation" or "Section 1: INITIATION" */
const SECTION_1_ALT_RE = /(?:\n|^)\s*Section\s+1\s*:\s*([^\n]+)/gi;

/** Accepted section-1 title values (normalized, exact match). Broadens INITIATION drift. */
const ACCEPTED_SECTION_1_TITLES = [
  "initiation",
  "introduction",
  "birth",
  "birth context",
  "context",
] as const;

function isAcceptedSection1Title(titlePart: string): boolean {
  const norm = titlePart.trim().toLowerCase().replace(/\s+/g, " ");
  return ACCEPTED_SECTION_1_TITLES.some((t) => norm === t);
}

/**
 * Parse report to locate section 1 (INITIATION or accepted alternates).
 * Tolerates: "1. INITIATION", "1. Introduction", "1. Birth", "1. Birth Context", "1. Context",
 * "Section 1: Initiation", etc.
 */
export function parseInitiationSection(report: string): InitiationParseResult {
  const result: InitiationParseResult = {
    initiationFound: false,
    contentStart: -1,
    contentEnd: -1,
    sectionContent: "",
    section2Start: -1,
  };

  if (!report || typeof report !== "string") return result;

  const matches: Array<{ num: number; start: number; end: number; fullMatch: string }> = [];
  let m;
  SECTION_HEADING_RE.lastIndex = 0;
  while ((m = SECTION_HEADING_RE.exec(report)) !== null) {
    const num = parseInt(m[3]!, 10);
    const start = m.index;
    const end = m.index + m[0].length;
    matches.push({ num, start, end, fullMatch: m[0] });
  }

  let sect1 = matches.find((x) => x.num === 1);
  const sect2 = matches.find((x) => x.num === 2);

  if (sect1) {
    const titlePart = sect1.fullMatch.replace(/^\s*(?:#+\s*)?\d+\.\s*/, "").trim();
    if (!isAcceptedSection1Title(titlePart)) sect1 = undefined;
  }

  if (!sect1) {
    SECTION_1_ALT_RE.lastIndex = 0;
    const alt = SECTION_1_ALT_RE.exec(report);
    const altTitle = alt?.[1]?.trim() ?? "";
    if (alt && isAcceptedSection1Title(altTitle)) {
      sect1 = { num: 1, start: alt.index, end: alt.index + alt[0].length, fullMatch: alt[0] };
    }
  }

  if (!sect1) return result;

  result.initiationFound = true;
  result.contentStart = sect1.end;
  result.section2Start = sect2 ? sect2.start : -1;
  result.contentEnd = sect2 ? sect2.start : report.length;
  result.sectionContent = report.slice(sect1.start, result.contentEnd);

  return result;
}

/** Normalize for name matching: lowercase, collapse spaces, strip diacritics */
function normalizeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Check if the full birth anchoring sentence is present in INITIATION.
 * Requires: subject name, birth location, birth date in a birth-anchoring context.
 * Partial matches (name only) are not sufficient — the full sentence structure is required.
 */
export function fullBirthAnchorPresentInInitiation(
  report: string,
  subjectInput: SubjectInput
): boolean {
  const { fullName, birthDate, birthLocation } = subjectInput;
  if (!fullName?.trim() || !birthDate?.trim() || !birthLocation?.trim()) return false;

  const parsed = parseInitiationSection(report);
  if (!parsed.initiationFound) return false;

  const sectionNorm = normalizeForMatch(parsed.sectionContent);
  const nameNorm = normalizeForMatch(fullName);
  const locNorm = normalizeForMatch(birthLocation);
  const dateNorm = normalizeForMatch(birthDate);

  // Must contain name (full or first as whole word)
  const hasName =
    sectionNorm.includes(nameNorm) ||
    (() => {
      const first = nameNorm.split(/\s+/)[0];
      if (!first || first.length < 2) return false;
      const re = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      return re.test(sectionNorm);
    })();

  if (!hasName) return false;

  // Must contain birth location
  const locParts = locNorm.split(",").map((p) => p.trim()).filter(Boolean);
  const hasLocation =
    sectionNorm.includes(locNorm) ||
    (locParts.length > 0 && locParts.some((p) => sectionNorm.includes(p)));
  if (!hasLocation) return false;

  // Must contain birth date (exact or year; report may use "12 March 1990" vs input "1990-03-12")
  const yearMatch = birthDate.match(/\b(19|20)\d{2}\b/);
  const hasDate =
    sectionNorm.includes(dateNorm) ||
    (yearMatch && sectionNorm.includes(yearMatch[0]!));
  if (!hasDate) return false;

  // Must contain birth-anchoring structure: "was born in" and physical grounding
  if (!/was\s+born\s+in/i.test(parsed.sectionContent)) return false;
  if (!/earth\s+rotated\s+beneath|rotated\s+beneath\s+a\s+specific/i.test(sectionNorm)) return false;

  return true;
}

/**
 * @deprecated Use fullBirthAnchorPresentInInitiation with full subjectInput.
 * Kept for backward compatibility; now delegates to full birth anchor check.
 */
export function subjectNamePresentInInitiation(
  report: string,
  fullNameOrSubjectInput: string | SubjectInput
): boolean {
  if (typeof fullNameOrSubjectInput === "string") {
    const subjectInput: SubjectInput = {
      fullName: fullNameOrSubjectInput,
      birthDate: "",
      birthLocation: "",
    };
    return fullBirthAnchorPresentInInitiation(report, subjectInput);
  }
  return fullBirthAnchorPresentInInitiation(report, fullNameOrSubjectInput);
}

export type InjectResult =
  | { ok: true; report: string; repairPath: "section_aware" }
  | { ok: false; report: string; reason: string; initiationFound: boolean; insertionPointFound: boolean };

/**
 * Deterministically inject birth-anchoring sentence into INITIATION.
 * Section-aware: locates section 1 by number, injects after heading.
 * Does not depend on "RAW SIGNAL" or other fragile patterns.
 */
export function injectBirthAnchoringSentence(
  report: string,
  subjectInput: SubjectInput
): InjectResult {
  const sentence = `When ${subjectInput.fullName} was born in ${subjectInput.birthLocation} on ${subjectInput.birthDate}, the Earth rotated beneath a specific configuration of solar radiation, gravitational geometry, lunar illumination, and atmospheric conditions.\n\n`;

  const parsed = parseInitiationSection(report);

  if (!parsed.initiationFound) {
    return {
      ok: false,
      report,
      reason: "INITIATION section not found",
      initiationFound: false,
      insertionPointFound: false,
    };
  }

  if (parsed.contentStart < 0) {
    return {
      ok: false,
      report,
      reason: "No insertion point (contentStart < 0)",
      initiationFound: true,
      insertionPointFound: false,
    };
  }

  const before = report.slice(0, parsed.contentStart);
  const after = report.slice(parsed.contentStart);
  const repaired = before + sentence + after;

  return {
    ok: true,
    report: repaired,
    repairPath: "section_aware",
  };
}

const CANONICAL_INITIATION_PREFIX = `1. INITIATION

`;

/**
 * Hard fallback: when no section 1 can be found, prepend canonical INITIATION + birth anchoring.
 * Use when parseInitiationSection returns initiationFound: false — do not fail the report.
 */
export function prependFallbackInitiationBlock(
  report: string,
  subjectInput: SubjectInput
): string {
  const sentence = `When ${subjectInput.fullName} was born in ${subjectInput.birthLocation} on ${subjectInput.birthDate}, the Earth rotated beneath a specific configuration of solar radiation, gravitational geometry, lunar illumination, and atmospheric conditions.\n\n`;
  const block = CANONICAL_INITIATION_PREFIX + sentence;
  return block + (report || "").replace(/^\s+/, "");
}
