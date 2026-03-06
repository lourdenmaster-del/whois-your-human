import type { OnThisDayContext } from "@/lib/history/onThisDay";

const REQUIRED_400_MESSAGE =
  "Missing required fields: fullName, birthDate, birthTime, birthLocation, email";

/** Birth time must be parseable (HH:MM or HH:MM:SS). */
const BIRTH_TIME_INVALID_MESSAGE =
  "birthTime is required and must be parseable (e.g. HH:MM or HH:MM:SS)";

/** Minimal birth context (deriveFromBirthData) + optional on-this-day history. */
export type BirthContextPayload = Record<string, unknown> & {
  onThisDay?: OnThisDayContext;
};

export type EngineBody = {
  fullName?: string;
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
  email?: string;
  dryRun?: boolean;
  notes?: string;
  archetype?: string;
  /** Client-provided UUID per click; when present, prevents duplicate OpenAI spend. */
  idempotencyKey?: string;
  /** Derived birth context from deriveFromBirthData; may include onThisDay. */
  birthContext?: BirthContextPayload | unknown;
  /** Legacy: same as birthContext, forwarded for backward compat */
  astrology?: unknown;
};

export type ValidatedEngineBody = EngineBody & {
  fullName: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  email: string;
};

/** Matches HH:MM or HH:MM:SS or HH-MM etc. */
function isParseableBirthTime(s: string): boolean {
  const t = s.trim().replace(/\s/g, "").slice(0, 8);
  if (!t || t.length < 4) return false;
  const parts = t.split(/[:\-]/).map((x) => parseInt(x, 10));
  return parts.length >= 2 && parts[0]! >= 0 && parts[0]! <= 23 && parts[1]! >= 0 && parts[1]! <= 59;
}

/** Normalize birth time to HH:MM:SS for consistent downstream timestamp construction. */
function normalizeBirthTime(s: string): string {
  const t = s.trim().replace(/\s/g, "").slice(0, 8);
  const parts = t.split(/[:\-]/).map((x) => parseInt(x, 10) || 0);
  const hh = Math.min(23, Math.max(0, parts[0] ?? 0));
  const mm = Math.min(59, Math.max(0, parts[1] ?? 0));
  const ss = parts.length >= 3 ? Math.min(59, Math.max(0, parts[2] ?? 0)) : 0;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function validateEngineBody(
  body: unknown
): { ok: true; value: ValidatedEngineBody } | { ok: false; error: { message: string } } {
  if (body == null || typeof body !== "object") {
    return { ok: false, error: { message: REQUIRED_400_MESSAGE } };
  }
  const b = body as Record<string, unknown>;
  const fullName = b.fullName;
  const birthDate = b.birthDate;
  const birthTime = b.birthTime;
  const birthLocation = b.birthLocation;
  const email = b.email;
  if (!fullName || !birthDate || !birthLocation || !email) {
    return { ok: false, error: { message: REQUIRED_400_MESSAGE } };
  }
  const timeStr = typeof birthTime === "string" ? birthTime : "";
  if (!timeStr.trim() || !isParseableBirthTime(timeStr)) {
    return { ok: false, error: { message: BIRTH_TIME_INVALID_MESSAGE } };
  }
  const normalized = { ...b, birthTime: normalizeBirthTime(timeStr) };
  return { ok: true, value: normalized as ValidatedEngineBody };
}
