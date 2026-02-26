import type { VoiceProfile } from "../schema";

/** Single validation issue. */
export interface ValidationIssue {
  rule: string;
  message: string;
  severity: "error" | "warning";
  detail?: string;
}

/** Result from a single validator. */
export interface ValidationResult {
  pass: boolean;
  issues: ValidationIssue[];
}

/** Input for voice output validation. */
export interface ValidateVoiceInput {
  text: string;
  profile: VoiceProfile;
  channel?: string | null;
}

/** Aggregate validation result. */
export interface VoiceValidationResult {
  pass: boolean;
  score: number;
  issues: ValidationIssue[];
}
