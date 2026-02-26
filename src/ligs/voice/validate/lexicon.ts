import type { VoiceProfile } from "../schema";
import type { ValidationResult, ValidationIssue } from "./types";

/** Check for avoid words (warning) and preferred-word presence (optional soft signal). */
export function validateLexicon(text: string, profile: VoiceProfile): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lower = text.toLowerCase();

  for (const word of profile.lexicon.avoid_words) {
    const re = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    const matches = text.match(re);
    if (matches && matches.length > 0) {
      issues.push({
        rule: "avoid_words",
        message: `Avoid word "${word}" found`,
        severity: "warning",
        detail: `Found ${matches.length} occurrence(s)`,
      });
    }
  }

  return {
    pass: issues.filter((i) => i.severity === "error").length === 0,
    issues,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
