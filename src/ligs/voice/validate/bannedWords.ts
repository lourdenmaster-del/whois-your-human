import type { VoiceProfile } from "../schema";
import type { ValidationResult, ValidationIssue } from "./types";

/** Scan text for banned words (case-insensitive). */
export function validateBannedWords(text: string, profile: VoiceProfile): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lower = text.toLowerCase();

  for (const word of profile.lexicon.banned_words) {
    const re = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    const matches = text.match(re);
    if (matches && matches.length > 0) {
      issues.push({
        rule: "banned_words",
        message: `Banned word "${word}" found`,
        severity: "error",
        detail: `Found ${matches.length} occurrence(s)`,
      });
    }
  }

  return {
    pass: issues.length === 0,
    issues,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
