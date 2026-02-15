import type { VectorZero } from "@/lib/vector-zero";
import type { BeautyProfile } from "@/lib/eve-spec";

/**
 * Canonical Beauty Profile schema (v1) — matches the shape produced by /api/eve.
 */
export interface BeautyProfileV1 extends BeautyProfile {
  version: "1.0";
  reportId: string;
  subjectName?: string;
  emotionalSnippet?: string;
  imagePrompts?: string[];
  imageUrls?: string[];
  fullReport?: string;
  vectorZero?: VectorZero;
  timings: {
    totalMs: number;
    engineMs: number;
    reportFetchMs: number;
    beautyFilterMs: number;
  };
}

function hasRequiredBeautyProfileV1(json: unknown): json is BeautyProfileV1 {
  if (json == null || typeof json !== "object") return false;
  const o = json as Record<string, unknown>;
  if (o.version !== "1.0") return false;
  if (typeof o.reportId !== "string") return false;
  const t = o.timings as Record<string, unknown> | undefined;
  if (!t || typeof t !== "object") return false;
  if (typeof t.totalMs !== "number" || typeof t.engineMs !== "number" || typeof t.reportFetchMs !== "number" || typeof t.beautyFilterMs !== "number") return false;
  const v0 = o.vector_zero as Record<string, unknown> | undefined;
  if (!v0 || typeof v0 !== "object") return false;
  const tt = v0.three_voice as Record<string, unknown> | undefined;
  const bb = v0.beauty_baseline as Record<string, unknown> | undefined;
  if (!tt || typeof tt !== "object" || !bb || typeof bb !== "object") return false;
  if (typeof (o.light_signature as Record<string, unknown>)?.raw_signal !== "string") return false;
  if (typeof (o.archetype as Record<string, unknown>)?.raw_signal !== "string") return false;
  if (typeof (o.deviations as Record<string, unknown>)?.raw_signal !== "string") return false;
  if (typeof (o.corrective_vector as Record<string, unknown>)?.raw_signal !== "string") return false;
  const ip = o.imagery_prompts as Record<string, unknown> | undefined;
  if (!ip || typeof ip !== "object") return false;
  return true;
}

/**
 * Asserts that json conforms to BeautyProfileV1. Throws if required fields are missing.
 */
export function assertBeautyProfileV1(json: unknown): asserts json is BeautyProfileV1 {
  if (!hasRequiredBeautyProfileV1(json)) {
    throw new Error("BEAUTY_PROFILE_SCHEMA_MISMATCH");
  }
}
