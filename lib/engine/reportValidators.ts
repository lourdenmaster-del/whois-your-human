/**
 * Report quality validators — run post-generation (after deterministic block injection).
 * Each validator returns a list of issues. Issues can trigger a repair pass or 500 on failure.
 */

import { ALLOWED_CITATION_KEYS } from "@/lib/engine/deterministic-blocks";
import {
  injectBirthAnchoringSentence as injectFromAnchor,
  fullBirthAnchorPresentInInitiation,
} from "@/lib/engine/initiation-anchor";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";

const FORBIDDEN_CITATION_VALUES = [
  "known", "variable", "placeholder", "n/a", "none", "null", "undefined",
];

/** Citation format: key=value — key lowercase alphanumeric+underscore, value non-empty */
const CITATION_INNER_REGEX = /^([a-z0-9_]+)=(.+)$/;

/** Required anchors: validation runs when both exist. Optional: LIGHT IDENTITY SUMMARY, ALLOWED CITATION KEYS. */
const REQUIRED_ANCHORS = ["(L) RESOLUTION KEYS", "(L) BOUNDARY CONDITIONS"] as const;

export interface ValidationIssue {
  code: string;
  message: string;
  detail?: string;
}

export interface BoundaryConditionsParsed {
  location?: string;
  localTimestamp?: string;
  utcTimestamp?: string;
}

export interface SubjectInput {
  fullName: string;
  birthDate: string;
  birthLocation: string;
}

/** Parse BOUNDARY CONDITIONS block from report to extract Location, Local, UTC. */
function parseBoundaryConditions(report: string): BoundaryConditionsParsed {
  const block = report.match(/\(L\) BOUNDARY CONDITIONS[\s\S]*?Location:\s*(.+?)(?:\n|$)/i);
  const locLine = block?.[1];
  const locMatch = report.match(/Location:\s*([^\n]+)/i);
  const localMatch = report.match(/Local:\s*([^\n]+)/i);
  const utcMatch = report.match(/UTC:\s*([^\n]+)/i);
  return {
    location: locMatch?.[1]?.trim(),
    localTimestamp: localMatch?.[1]?.trim(),
    utcTimestamp: utcMatch?.[1]?.trim(),
  };
}

const INITIATION_SECTION_RE = /(?:^|\n)\s*1\.\s*Initiation[\s\S]*?(?=\n\s*2\.\s+Spectral|$)/i;

/** Normalize for name matching: lowercase, collapse spaces, strip diacritics (José → jose). */
function normalizeForNameMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Extract birth references from INITIATION / opening (name, date, place patterns). */
function extractBirthReferences(report: string): { name?: string; date?: string; place?: string } {
  const initMatch = report.match(INITIATION_SECTION_RE);
  const init = (initMatch?.[0] ?? report.slice(0, 2500)).toLowerCase();
  const initOrig = initMatch?.[0] ?? report.slice(0, 2500); // preserve case for name extraction
  // Patterns: "when X was born", "organism identified as X", "X entered the world", "X's birth", "birth of X", "For X,", etc.
  const nameInBorn = initOrig.match(/when\s+([^,\n]+?)\s+was\s+born/i);
  const nameInOrganism = initOrig.match(/organism\s+identified\s+as\s+([^,\n.]+)/i);
  const nameInEntered = initOrig.match(/([A-Za-z][A-Za-z\s]+?)\s+entered\s+(?:the\s+)?(?:physical\s+)?world/i);
  const namePossessive = initOrig.match(/([A-Za-z][A-Za-z\s]+?)'s\s+birth/i);
  const nameBirthOf = initOrig.match(/(?:birth|birth event)\s+of\s+([A-Za-z][A-Za-z\s]+?)(?:\s+in|\s+on|[,.\s]|$)/i);
  const nameAtBirthOf = initOrig.match(/at\s+the\s+(?:birth|moment)\s+of\s+([A-Za-z][A-Za-z\s]+?)(?:\s|,|\.|$)/i);
  const nameFor = initOrig.match(/(?:for|regarding)\s+([A-Za-z][A-Za-z\s]+?)(?:,|\s+environments|\s+the)/i);
  const nameCommaBorn = initOrig.match(/([A-Za-z][A-Za-z\s]+?),?\s+born\s+(?:on|in)/i);
  const placeInBorn = init.match(/(?:born|in)\s+([A-Za-z][^,]+(?:,\s*[A-Za-z\s]+)?)\s+on\s+/i);
  const placeInOn = init.match(/on\s+([^,]+)\s+in\s+([^,\n.]+)/i);
  const dateMatch = init.match(/(?:\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
  const name =
    nameInBorn?.[1] ??
    nameInOrganism?.[1] ??
    nameInEntered?.[1] ??
    namePossessive?.[1] ??
    nameBirthOf?.[1] ??
    nameAtBirthOf?.[1] ??
    nameFor?.[1] ??
    nameCommaBorn?.[1];
  return {
    name: name?.trim(),
    place: (placeInBorn?.[1] ?? placeInOn?.[2])?.trim(),
    date: dateMatch?.[0]?.trim(),
  };
}

/** Validate single subject: birth header (name/date/location) should align with BOUNDARY CONDITIONS. */
export function validateSingleSubject(
  report: string,
  subjectInput: SubjectInput,
  boundaryParsed?: BoundaryConditionsParsed
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const bc = boundaryParsed ?? parseBoundaryConditions(report);
  const refs = extractBirthReferences(report);

  if (subjectInput.fullName) {
    // Require full birth anchoring sentence in INITIATION (name + location + date + physical grounding).
    // No partial matches: name-only or refs.name from partial extraction is insufficient.
    const hasFullAnchor = fullBirthAnchorPresentInInitiation(report, subjectInput);
    const nameFound = hasFullAnchor ? subjectInput.fullName.trim() : undefined;
    if (!nameFound) {
      issues.push({
        code: "SUBJECT_NAME_MISSING",
        message: "Report must reference the individual's full name in INITIATION.",
        detail: `Provided: ${subjectInput.fullName}`,
      });
    } else {
      const inputNorm = subjectInput.fullName.trim().toLowerCase().replace(/\s+/g, " ");
      const refNorm = (refs.name ?? nameFound).toLowerCase().replace(/\s+/g, " ");
      if (!inputNorm.includes(refNorm) && !refNorm.includes(inputNorm)) {
        issues.push({
          code: "SUBJECT_NAME_MISMATCH",
          message: "Report references a different name than the provided subject.",
          detail: `Provided: ${subjectInput.fullName}, Report: ${refs.name}`,
        });
      }
    }
  }

  if (subjectInput.birthLocation && bc.location) {
    const inputNorm = subjectInput.birthLocation.trim().toLowerCase();
    const bcNorm = bc.location.toLowerCase();
    if (!bcNorm.includes(inputNorm) && !inputNorm.includes(bcNorm) && bc.location !== "unknown") {
      issues.push({
        code: "SUBJECT_LOCATION_MISMATCH",
        message: "Report location does not match BOUNDARY CONDITIONS.",
        detail: `Provided: ${subjectInput.birthLocation}, BC: ${bc.location}`,
      });
    }
  }

  return issues;
}

/** Extract canonical regime from RESOLUTION KEYS block (source of truth). */
export function extractCanonicalRegimeFromReport(report: string): string | null {
  const m = report.match(/\(L\)\s+RESOLUTION\s+KEYS[\s\S]*?Regime:\s*([^\n]+)/i);
  return m?.[1]?.trim() ?? null;
}

/** Extract regime/archetype from report sections. */
function extractRegimeMentions(report: string): { summary?: string; resolution?: string; sect6?: string; exemplar?: string } {
  const summary = report.match(/\(L\) LIGHT IDENTITY SUMMARY[\s\S]*?Archetype:\s*(\S+)/i);
  const resolution = report.match(/\(L\) RESOLUTION KEYS[\s\S]*?Regime:\s*(\S+)/i);
  const archInSect6 = report.match(/\s*6\.\s*Archetype\s+Revelation[\s\S]*?(Ignispectrum|Stabiliora|Duplicaris|Tenebris|Radiantis|Precisura|Aequilibris|Obscurion|Vectoris|Structoris|Innovaris|Fluxionis)/i);
  const exemplar = report.match(/Field reference:.*?resolved as\s+(\w+)/i);
  return {
    summary: summary?.[1]?.trim(),
    resolution: resolution?.[1]?.trim(),
    sect6: archInSect6?.[1],
    exemplar: exemplar?.[1]?.trim(),
  };
}

/** Validate single regime: Exemplar/SMMARY/RESOLUTION KEYS/§6 must match. */
export function validateSingleRegime(
  report: string,
  canonicalRegime: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mentions = extractRegimeMentions(report);
  const canonical = canonicalRegime.trim();

  const check = (label: string, val: string | undefined) => {
    if (val && val !== canonical && (LIGS_ARCHETYPES as readonly string[]).includes(val)) {
      issues.push({
        code: "REGIME_MISMATCH",
        message: `Regime mismatch: ${label} says "${val}" but canonical (RESOLUTION KEYS) is "${canonical}".`,
        detail: `${label}=${val}, canonical=${canonical}`,
      });
    }
  };

  check("SUMMARY", mentions.summary);
  check("RESOLUTION_KEYS", mentions.resolution);
  check("§6", mentions.sect6);
  check("Exemplar/Anchor", mentions.exemplar);

  return issues;
}

/** Extract RAW SIGNAL bullets and their [key=value] citations. Enforces exactly one citation per bullet. */
function extractRawSignalCitations(report: string): Array<{ bullet: string; citation: string; key?: string; value?: string }> {
  const results: Array<{ bullet: string; citation: string; key?: string; value?: string }> = [];
  const rawSection = report.split(/(?:^|\n)\s*RAW SIGNAL\s*/i);
  for (let i = 1; i < rawSection.length; i++) {
    const content = rawSection[i]!.split(/(?:^|\n)\s*(?:CUSTODIAN|ORACLE)\s*/i)[0] ?? "";
    const bullets = content.split(/\n\s*[-•*]\s*/).filter((b) => b.trim().length > 0);
    for (const b of bullets) {
      const bulletTrim = b.trim();
      const bracketMatch = bulletTrim.match(/\[([^\]]+)\]\s*$/);
      if (!bracketMatch) {
        results.push({ bullet: bulletTrim, citation: "" });
        continue;
      }
      const inner = bracketMatch[1]!.trim();
      const formatMatch = inner.match(CITATION_INNER_REGEX);
      if (formatMatch) {
        const key = formatMatch[1];
        const value = formatMatch[2]?.trim();
        results.push({ bullet: bulletTrim, citation: inner, key, value });
      } else {
        results.push({ bullet: bulletTrim, citation: inner, key: undefined, value: undefined });
      }
      // Only flag MULTIPLE when there are 2+ valid [key=value] citations (ignore other brackets e.g. [see note])
      const citationBrackets = bulletTrim.match(/\[[a-z0-9_]+=[^\]]*\]/g);
      if (citationBrackets && citationBrackets.length > 1) {
        results[results.length - 1]!.citation = "MULTIPLE";
      }
    }
  }
  return results;
}

/** Validate citations: allowed keys only, no placeholder values, exactly one per RAW SIGNAL bullet. */
export function validateCitations(
  report: string,
  allowedKeys: readonly string[] = ALLOWED_CITATION_KEYS
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const set = new Set(allowedKeys.map((k) => k.toLowerCase()));
  const citations = extractRawSignalCitations(report);

  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]!;
    if (!c.citation) {
      issues.push({
        code: "CITATION_MISSING",
        message: "RAW SIGNAL bullet missing [key=value] citation.",
        detail: c.bullet.slice(0, 80),
      });
      continue;
    }
    if (c.citation === "MULTIPLE") {
      issues.push({
        code: "CITATION_MULTIPLE",
        message: "RAW SIGNAL bullet must have exactly one [key=value] citation.",
        detail: c.bullet.slice(0, 100),
      });
      continue;
    }

    const key = c.key?.toLowerCase();
    if (!key) {
      issues.push({
        code: "CITATION_INVALID",
        message: "Citation must match [key=value] format; key must be present.",
        detail: c.citation,
      });
      continue;
    }

    const value = c.value?.trim() ?? "";
    if (!value) {
      issues.push({
        code: "CITATION_EMPTY_VALUE",
        message: "Citation value must be present; [key] or [key=] is invalid.",
        detail: c.citation,
      });
      continue;
    }

    if (!set.has(key)) {
      issues.push({
        code: "CITATION_KEY_FORBIDDEN",
        message: `Citation key "${c.key}" is not in allowed list.`,
        detail: c.citation,
      });
    }

    const valLower = value.toLowerCase();
    const isNumericOrUnit = /^-?\d+(\.\d+)?%?°?$/.test(value);
    const isPlaceholder = FORBIDDEN_CITATION_VALUES.some((f) => valLower === f);
    if (!isNumericOrUnit && isPlaceholder) {
      issues.push({
        code: "CITATION_PLACEHOLDER",
        message: "Citation value must be actual number/string; known, variable, none, null, undefined, n/a are invalid.",
        detail: c.citation,
      });
    }
  }

  return issues;
}

/** Strip deterministic blocks and [key=value] citations for narrative-only comparison. */
function stripDeterministicAndCitations(text: string): string {
  let out = text;
  const blockRe = /-{50,}\s*\n[\s\S]*?\(L\)\s+(?:BOUNDARY CONDITIONS|LIGHT IDENTITY SUMMARY|RESOLUTION KEYS|ALLOWED CITATION KEYS|FIELD SOLUTION)[\s\S]*?-{50,}/g;
  out = out.replace(blockRe, "");
  out = out.replace(/\[[a-z0-9_]+=[^\]]*\]/g, "");
  return out;
}

/** Lightweight repetition check: extract key phrases from narrative only (exclude deterministic blocks and citations). */
export function validateRepetition(report: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const narrativeOnly = stripDeterministicAndCitations(report);
  const sections = narrativeOnly.split(/(?=\n\s*\d+\.\s+)/);
  const phrasesPerSection: string[][] = [];

  for (const s of sections) {
    const clean = s.replace(/\n/g, " ").toLowerCase();
    const phrases = clean.match(/\b[\w]{4,}\b/g) ?? [];
    phrasesPerSection.push([...new Set(phrases)]);
  }

  for (let i = 1; i < phrasesPerSection.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = new Set(phrasesPerSection[i] ?? []);
      const b = phrasesPerSection[j] ?? [];
      const overlap = b.filter((p) => a.has(p)).length;
      const ratio = b.length > 0 ? overlap / b.length : 0;
      if (ratio > 0.6 && overlap >= 5) {
        issues.push({
          code: "REPETITION_HIGH",
          message: `Sections ${j + 1} and ${i + 1} have high phrase overlap; each should introduce new insight.`,
          detail: `Overlap: ${overlap} phrases`,
        });
        break;
      }
    }
  }

  return issues;
}

/** Check §7–§10 ORACLE has concrete life expression (environment, rhythm, role). */
const ORACLE_CONCRETE_PATTERNS = [
  /\b(environments?|settings?|institutions?|chaotic|transitional|high[- ]?structure)\b/i,
  /\b(rhythms?|early|late|bursts?|ambiguity|steady)\b/i,
  /\b(teacher|operator|organizer|responder|builder|analyst|caretaker|roles?|professions?|work)\b/i,
  /\b(activity|pattern|schedule|routine)\b/i,
];

/** Generic statements that should trigger repair (no concrete expression). */
const ORACLE_GENERIC_PATTERNS = [
  /\bfavors?\s+balance\b/i,
  /\b(seeks?|seeking)\s+balance\b/i,
  /\b(stability|coherence|equilibrium)\s+(alone|only)\b/i,
  /\bthis regime (favors|seeks|tends)\s+(only|merely)\s+(balance|stability|coherence)\b/i,
];

function extractOracleContent(report: string, sectionNum: number): string {
  const titles = [
    "Archetype Micro-Profiles", "Behavioral Expression", "Relational Field", "Environmental Resonance",
  ];
  const idx = sectionNum - 7;
  if (idx < 0 || idx >= titles.length) return "";
  const title = titles[idx]!;
  const re = new RegExp(`\\d+\\.\\s*${title.replace(/\s/g, "\\s")}[\\s\\S]*?ORACLE\\s*([\\s\\S]*?)(?=\\n\\s*\\d+\\.|$)`, "i");
  const m = report.match(re);
  return (m?.[1] ?? "").trim();
}

export function validateOracleConcrete(report: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const num of [7, 8, 9, 10]) {
    const oracle = extractOracleContent(report, num);
    if (!oracle || oracle.length < 20) continue;
    const hasGeneric = ORACLE_GENERIC_PATTERNS.some((p) => p.test(oracle));
    if (hasGeneric) {
      issues.push({
        code: "ORACLE_TOO_GENERIC",
        message: `Section ${num} ORACLE must include real-world expression (environment, rhythm, profession); avoid "favors balance" type statements.`,
        detail: oracle.slice(0, 100),
      });
      continue;
    }
    const hasConcrete = ORACLE_CONCRETE_PATTERNS.some((p) => p.test(oracle));
    if (!hasConcrete) {
      issues.push({
        code: "ORACLE_TOO_GENERIC",
        message: `Section ${num} ORACLE must include concrete life expression (environment, rhythm, or role/profession).`,
        detail: oracle.slice(0, 100),
      });
    }
  }
  return issues;
}

/** Build repair prompt for report quality issues. Preserve deterministic blocks. */
export function buildReportRepairPrompt(
  report: string,
  issues: ValidationIssue[],
  opts?: { subjectInput?: SubjectInput; canonicalRegime?: string }
): { system: string; user: string } {
  const issueList = issues.slice(0, 10).map((i) => `- [${i.code}] ${i.message}${i.detail ? ` (${i.detail})` : ""}`).join("\n");
  const hasSubjectMissing = issues.some((i) => i.code === "SUBJECT_NAME_MISSING");
  const subjectLine = opts?.subjectInput
    ? `\nUse this subject: ${opts.subjectInput.fullName}, ${opts.subjectInput.birthDate}, ${opts.subjectInput.birthLocation}`
    : "";
  const subjectInsertBlock =
    hasSubjectMissing && opts?.subjectInput
      ? `

SUBJECT_NAME_MISSING FIX (required): The report must reference the individual's full name in INITIATION. Insert a birth-anchoring sentence immediately after "1. INITIATION" and before RAW SIGNAL. Example: "When ${opts.subjectInput.fullName} was born in ${opts.subjectInput.birthLocation} on ${opts.subjectInput.birthDate}, the Earth rotated beneath a specific configuration of solar radiation, gravitational geometry, and atmospheric conditions." Use the exact provided name, date, and location.`
      : "";
  const regimeLine = opts?.canonicalRegime ? `\nCanonical regime (use everywhere): ${opts.canonicalRegime}` : "";
  return {
    system: `You are a strict editor. Fix report quality issues. Output valid JSON only with key "full_report" (string).

CRITICAL — Do NOT modify deterministic blocks. Only repair narrative sections and conflicting headers.
Protected blocks (leave exactly as-is):
- (L) BOUNDARY CONDITIONS
- (L) LIGHT IDENTITY SUMMARY
- (L) RESOLUTION KEYS
- (L) ALLOWED CITATION KEYS

RULES:
- Do NOT change section headings or structure.
- For SUBJECT: Use the provided full name, birth date, birth location in INITIATION.${subjectInsertBlock}
- For REGIME: Rewrite all regime references to match the canonical regime (RESOLUTION KEYS). No conflicting archetype names.
- For CITATIONS: Each RAW SIGNAL bullet must end with exactly one [key=value]. One citation per bullet only — no second [key=value] in the same bullet; no uncited bullets. Key in allowed list. Value must be number, string, or "unknown" — never known, variable, none, null, undefined, n/a.
- For ORACLE (§7–§10): Include at least one real-world expression (environment, rhythm of work/rest, profession/role cluster, activity pattern). Avoid generic "favors balance" statements.
- Reduce jargon: describe consequences in plain language.
- Each section must introduce one new insight; avoid repetition.`,
    user: `Fix these issues in the report:

${issueList}${subjectLine}${subjectInsertBlock}${regimeLine}

Report to repair:
${report}`,
  };
}

/**
 * @deprecated Use injectBirthAnchoringSentence from @/lib/engine/initiation-anchor instead.
 * This wrapper delegates to the section-aware implementation. Throws if injection fails.
 */
export function injectBirthAnchoringSentence(
  report: string,
  subjectInput: SubjectInput
): string {
  const result = injectFromAnchor(report, subjectInput);
  if (!result.ok) {
    throw new Error(
      `Subject name injection failed: ${result.reason} (initiationFound=${result.initiationFound}, insertionPointFound=${result.insertionPointFound})`
    );
  }
  return result.report;
}

/** Return true if report has both ground-truth blocks (run validation when true). */
export function hasDeterministicAnchors(report: string): boolean {
  return REQUIRED_ANCHORS.every((a) => report.includes(a));
}

/** Run all validators. Returns combined issues. Uses RESOLUTION KEYS Regime as canonical when not provided. */
export function validateReport(
  report: string,
  opts: {
    subjectInput?: SubjectInput;
    canonicalRegime?: string;
    allowedKeys?: readonly string[];
  }
): ValidationIssue[] {
  const all: ValidationIssue[] = [];
  const bc = parseBoundaryConditions(report);
  const canonicalRegime = opts.canonicalRegime ?? extractCanonicalRegimeFromReport(report);

  if (opts.subjectInput) {
    all.push(...validateSingleSubject(report, opts.subjectInput, bc));
  }
  if (canonicalRegime) {
    all.push(...validateSingleRegime(report, canonicalRegime));
  }
  all.push(...validateCitations(report, opts.allowedKeys ?? ALLOWED_CITATION_KEYS));
  all.push(...validateRepetition(report));
  all.push(...validateOracleConcrete(report));

  return all;
}
