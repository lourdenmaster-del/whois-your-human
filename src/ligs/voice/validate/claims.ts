import type { VoiceProfile } from "../schema";
import type { ValidationResult, ValidationIssue } from "./types";

const MEDICAL_CLAIM_PATTERNS = [
  /\bcure[sd]?\b/i,
  /\bheal(s|ing|ed)?\b/i,
  /\btreat(s|ing|ment|ed)?\b/i,
  /\bdiagnos(e|is|ed)\b/i,
  /\bcures?\s+(cancer|disease|condition)\b/i,
  /\beliminates?\s+(wrinkles?|aging)\b/i,
  /\bmedical(ly)?\s+(proven|effective)\b/i,
];

const BEFORE_AFTER_PATTERNS = [
  /\bbefore\s+and\s+after\b/i,
  /\btransform(s|ation)?\s+(your|the)\b/i,
  /\bguaranteed?\s+(results?|outcomes?)\b/i,
  /\bmiracle\b/i,
  /\binstant(ly)?\s+(results?|transformation)\b/i,
];

/** Scan text for prohibited medical claims and before/after promises. */
export function validateClaims(text: string, profile: VoiceProfile): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (profile.claims_policy.medical_claims === "prohibited") {
    for (const re of MEDICAL_CLAIM_PATTERNS) {
      const match = text.match(re);
      if (match) {
        issues.push({
          rule: "medical_claims",
          message: "Medical claim detected",
          severity: "error",
          detail: `"${match[0]}"`,
        });
        break;
      }
    }
  }

  if (profile.claims_policy.before_after_promises === "prohibited") {
    for (const re of BEFORE_AFTER_PATTERNS) {
      const match = text.match(re);
      if (match) {
        issues.push({
          rule: "before_after_promises",
          message: "Before/after promise detected",
          severity: "error",
          detail: `"${match[0]}"`,
        });
        break;
      }
    }
  }

  return {
    pass: issues.length === 0,
    issues,
  };
}
