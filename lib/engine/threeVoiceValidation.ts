/**
 * Three-voice validation: ensure each section (1–14) has RAW SIGNAL, CUSTODIAN, ORACLE.
 * If missing → repair ONLY that section.
 */

export interface SectionMissingVoice {
  sectionNum: number;
  sectionTitle: string;
  missing: Array<"RAW SIGNAL" | "CUSTODIAN" | "ORACLE">;
}

const VOICE_LABELS = ["RAW SIGNAL", "CUSTODIAN", "ORACLE"] as const;
const SECTION_HEADINGS = [
  [1, "Initiation"],
  [2, "Spectral Origin"],
  [3, "Temporal Encoding"],
  [4, "Gravitational Patterning"],
  [5, "Directional Field"],
  [6, "Archetype Revelation"],
  [7, "Archetype Micro-Profiles"],
  [8, "Behavioral Expression"],
  [9, "Relational Field"],
  [10, "Environmental Resonance"],
  [11, "Cosmology Overlay"],
  [12, "Identity Field Equation"],
  [13, "Legacy Trajectory"],
  [14, "Integration"],
] as const;

/** Extract section content (between this section heading and next, or end). */
function extractSectionContent(report: string, sectionNum: number): string {
  const [num, title] = SECTION_HEADINGS[sectionNum - 1]!;
  const titlePattern = new RegExp(`\\d+\\.\\s*${title.replace(/\s/g, "\\s")}`, "i");
  const nextSection = SECTION_HEADINGS[sectionNum];
  const nextPattern = nextSection
    ? new RegExp(`\\n\\s*${nextSection[0]}\\.\\s*${(nextSection[1] as string).replace(/\s/g, "\\s")}`, "i")
    : null;
  const start = report.search(titlePattern);
  if (start < 0) return "";
  const sliceStart = start;
  const sliceEnd = nextPattern ? report.slice(sliceStart).search(nextPattern) : -1;
  const content =
    sliceEnd >= 0 ? report.slice(sliceStart, sliceStart + sliceEnd) : report.slice(sliceStart);
  return content;
}

/** Check which voice labels are present (case-insensitive). */
function voicesPresentInSection(sectionContent: string): Set<string> {
  const found = new Set<string>();
  const lower = sectionContent.toLowerCase();
  for (const label of VOICE_LABELS) {
    if (lower.includes(label.toLowerCase())) found.add(label);
  }
  return found;
}

export function validateThreeVoiceSections(report: string): SectionMissingVoice[] {
  const issues: SectionMissingVoice[] = [];
  for (let i = 1; i <= 14; i++) {
    const content = extractSectionContent(report, i);
    if (!content.trim()) continue;
    const present = voicesPresentInSection(content);
    const missing = VOICE_LABELS.filter((v) => !present.has(v));
    if (missing.length > 0) {
      const [, title] = SECTION_HEADINGS[i - 1]!;
      issues.push({
        sectionNum: i,
        sectionTitle: title,
        missing: missing as Array<"RAW SIGNAL" | "CUSTODIAN" | "ORACLE">,
      });
    }
  }
  return issues;
}

/** Build repair prompt for sections missing voices. Repair ONLY those sections. */
export function buildThreeVoiceRepairPrompt(report: string, issues: SectionMissingVoice[]): string {
  const sectionNums = issues.map((i) => i.sectionNum).join(", ");
  const missingDesc = issues
    .map((i) => `Section ${i.sectionNum} (${i.sectionTitle}): missing ${i.missing.join(", ")}`)
    .join("; ");
  return `The following report has sections missing required voice labels (RAW SIGNAL, CUSTODIAN, ORACLE).

Sections to repair: ${sectionNums}
${missingDesc}

Add ONLY the missing voice(s) to each affected section. Do not change any other content. Do not add new sections. Output valid JSON with key "full_report" (string). Keep the exact same structure and wording otherwise.

Report:
${report}`;
}
