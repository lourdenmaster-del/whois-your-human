import type { ZodError } from "zod";

export type VoiceEngineError =
  | {
      kind: "VALIDATION_ERROR";
      message: string;
      issues: Array<{ path: string; message: string }>;
    }
  | { kind: "UNKNOWN_ERROR"; message: string };

export function zodToVoiceEngineError(err: ZodError): VoiceEngineError {
  return {
    kind: "VALIDATION_ERROR",
    message: "VoiceProfile validation failed",
    issues: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  };
}

export function toVoiceEngineError(error: unknown): VoiceEngineError {
  if (error instanceof Error) {
    return { kind: "UNKNOWN_ERROR", message: error.message };
  }
  return { kind: "UNKNOWN_ERROR", message: String(error) };
}
