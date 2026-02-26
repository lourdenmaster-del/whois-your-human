import type { VoiceProfile } from "../schema";
import type { ValidationResult, ValidationIssue } from "./types";

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/** Check sentence and paragraph length adherence. */
export function validateCadence(text: string, profile: VoiceProfile): ValidationResult {
  const issues: ValidationIssue[] = [];
  const [minW, maxW] = profile.cadence.sentence_length.range;
  const [minS, maxS] = profile.cadence.paragraph_length.range;
  const targetW = profile.cadence.sentence_length.target_words;
  const targetS = profile.cadence.paragraph_length.target_sentences;

  const sentences = splitSentences(text);
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

  let outOfRangeSentences = 0;
  for (const s of sentences) {
    const w = wordCount(s);
    if (w < minW || w > maxW) outOfRangeSentences++;
  }

  if (outOfRangeSentences > 0 && sentences.length > 0) {
    const pct = Math.round((outOfRangeSentences / sentences.length) * 100);
    issues.push({
      rule: "cadence_sentence",
      message: `${outOfRangeSentences}/${sentences.length} sentences outside range ${minW}–${maxW} words (target: ${targetW})`,
      severity: pct > 50 ? "error" : "warning",
      detail: `${pct}% of sentences out of range`,
    });
  }

  if (paragraphs.length > 0) {
    let outOfRangeParagraphs = 0;
    for (const p of paragraphs) {
      const sCount = splitSentences(p).filter((s) => s.length > 0).length;
      if (sCount < minS || sCount > maxS) outOfRangeParagraphs++;
    }
    if (outOfRangeParagraphs > 0) {
      const pct = Math.round((outOfRangeParagraphs / paragraphs.length) * 100);
      issues.push({
        rule: "cadence_paragraph",
        message: `${outOfRangeParagraphs}/${paragraphs.length} paragraphs outside range ${minS}–${maxS} sentences (target: ${targetS})`,
        severity: pct > 50 ? "error" : "warning",
        detail: `${pct}% of paragraphs out of range`,
      });
    }
  }

  return {
    pass: issues.length === 0,
    issues,
  };
}
