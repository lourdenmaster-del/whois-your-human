import type { VoiceProfile } from "../schema";
import type { ValidationResult, ValidationIssue } from "./types";

const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;

/** Check emoji and exclamation policy. */
export function validateFormatting(text: string, profile: VoiceProfile): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (profile.formatting.emoji_policy === "none") {
    const emojiMatches = text.match(EMOJI_REGEX);
    if (emojiMatches && emojiMatches.length > 0) {
      issues.push({
        rule: "emoji_policy",
        message: "Emoji used but policy is 'none'",
        severity: "error",
        detail: `Found ${emojiMatches.length} emoji`,
      });
    }
  } else if (profile.formatting.emoji_policy === "rare") {
    const emojiMatches = text.match(EMOJI_REGEX);
    if (emojiMatches && emojiMatches.length > 3) {
      issues.push({
        rule: "emoji_policy",
        message: "Too many emoji for 'rare' policy",
        severity: "warning",
        detail: `Found ${emojiMatches.length} emoji`,
      });
    }
  }

  if (profile.formatting.exclamation_policy === "none") {
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 0) {
      issues.push({
        rule: "exclamation_policy",
        message: "Exclamation marks used but policy is 'none'",
        severity: "error",
        detail: `Found ${exclamationCount}`,
      });
    }
  } else if (profile.formatting.exclamation_policy === "rare") {
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 2) {
      issues.push({
        rule: "exclamation_policy",
        message: "Too many exclamations for 'rare' policy",
        severity: "warning",
        detail: `Found ${exclamationCount}`,
      });
    }
  }

  return {
    pass: issues.length === 0,
    issues,
  };
}
