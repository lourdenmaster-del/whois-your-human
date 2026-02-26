import type { VoiceProfile } from "../schema";
import type {
  VoiceValidationResult,
  ValidationIssue,
  ValidateVoiceInput,
} from "./types";
import { validateBannedWords } from "./bannedWords";
import { validateClaims } from "./claims";
import { validateCadence } from "./cadence";
import { validateFormatting } from "./formatting";
import { validateLexicon } from "./lexicon";
import { validateChannelStructure } from "./channelStructure";

/** Run all validators and return aggregate result. */
export function validateVoiceOutput(input: ValidateVoiceInput): VoiceValidationResult {
  const { text, profile, channel } = input;
  const allIssues: ValidationIssue[] = [];

  const results = [
    validateBannedWords(text, profile),
    validateClaims(text, profile),
    validateCadence(text, profile),
    validateFormatting(text, profile),
    validateLexicon(text, profile),
    validateChannelStructure(text, profile, channel ?? null),
  ];

  for (const r of results) {
    allIssues.push(...r.issues);
  }

  const errorCount = allIssues.filter((i) => i.severity === "error").length;
  const warningCount = allIssues.filter((i) => i.severity === "warning").length;
  const pass = errorCount === 0;

  const score = Math.max(
    0,
    100 - errorCount * 25 - warningCount * 5
  );

  return {
    pass,
    score,
    issues: allIssues,
  };
}
