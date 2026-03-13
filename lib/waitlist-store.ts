/**
 * Waitlist storage: Blob-backed with email-hash paths for duplicate detection.
 * Table-like structure: email, created_at, source, preview_archetype, solar_season,
 * plus optional intake fields when provided (name, birthDate, birthPlace, birthTime).
 */

import { put, head, del, get } from "@vercel/blob";
import { createHash } from "crypto";

const BLOB_PREFIX = "ligs-waitlist/entries/";

/** Max lengths for persisted optional strings (sanitized at API layer). */
const MAX_NAME = 128;
const MAX_BIRTH_DATE = 64;
const MAX_BIRTH_PLACE = 256;
const MAX_BIRTH_TIME = 64;

function emailToKey(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 32);
}

export interface WaitlistEntry {
  email: string;
  created_at: string;
  source: string;
  preview_archetype?: string;
  solar_season?: string;
  name?: string;
  birthDate?: string;
  birthPlace?: string;
  birthTime?: string;
  /** Set after each successful confirmation send (first or duplicate resend). */
  last_confirmation_sent_at?: string;
  /** Incremented each time a confirmation is sent for this entry. */
  confirmation_send_count?: number;
}

/** Check if email already exists. */
export async function existsByEmail(email: string): Promise<boolean> {
  const key = emailToKey(email);
  const path = `${BLOB_PREFIX}${key}.json`;
  try {
    await head(path);
    return true;
  } catch {
    return false;
  }
}

/** Insert entry. Returns true if new, false if duplicate (no insert). */
async function insertIfNew(entry: WaitlistEntry): Promise<{ inserted: boolean }> {
  const email = entry.email.trim().toLowerCase();
  if (await existsByEmail(email)) {
    return { inserted: false };
  }
  const key = emailToKey(email);
  const path = `${BLOB_PREFIX}${key}.json`;
  const payload: Record<string, string> = {
    email: entry.email.trim().toLowerCase(),
    created_at: entry.created_at,
    source: entry.source,
  };
  if (entry.preview_archetype) payload.preview_archetype = entry.preview_archetype;
  if (entry.solar_season) payload.solar_season = entry.solar_season;
  if (entry.name) payload.name = entry.name.slice(0, MAX_NAME);
  if (entry.birthDate) payload.birthDate = entry.birthDate.slice(0, MAX_BIRTH_DATE);
  if (entry.birthPlace) payload.birthPlace = entry.birthPlace.slice(0, MAX_BIRTH_PLACE);
  if (entry.birthTime) payload.birthTime = entry.birthTime.slice(0, MAX_BIRTH_TIME);

  await put(path, JSON.stringify(payload), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  return { inserted: true };
}

export interface InsertWaitlistPayload {
  email: string;
  source?: string;
  preview_archetype?: string;
  solar_season?: string;
  name?: string;
  birthDate?: string;
  birthPlace?: string;
  birthTime?: string;
}

/** Insert waitlist entry with duplicate check. Returns ok + alreadyRegistered when duplicate. */
export async function insertWaitlistEntry(
  payload: InsertWaitlistPayload
): Promise<{ ok: boolean; alreadyRegistered?: boolean }> {
  const email = payload.email.trim().toLowerCase();
  const { inserted } = await insertIfNew({
    email,
    created_at: new Date().toISOString(),
    source: typeof payload.source === "string" ? payload.source.slice(0, 64) : "beauty",
    ...(payload.preview_archetype && { preview_archetype: payload.preview_archetype }),
    ...(payload.solar_season && { solar_season: payload.solar_season }),
    ...(payload.name && { name: payload.name.slice(0, MAX_NAME) }),
    ...(payload.birthDate && { birthDate: payload.birthDate.slice(0, MAX_BIRTH_DATE) }),
    ...(payload.birthPlace && { birthPlace: payload.birthPlace.slice(0, MAX_BIRTH_PLACE) }),
    ...(payload.birthTime && { birthTime: payload.birthTime.slice(0, MAX_BIRTH_TIME) }),
  });
  if (!inserted) {
    return { ok: true, alreadyRegistered: true };
  }
  return { ok: true };
}

/** Path for a normalized email (internal use; same as insert). */
function pathForEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return `${BLOB_PREFIX}${emailToKey(normalized)}.json`;
}

/**
 * Internal/operator only: delete waitlist blob for exact normalized email.
 * No effect if entry does not exist.
 */
export async function deleteWaitlistEntryByEmail(
  email: string
): Promise<{ deleted: boolean; email: string }> {
  const normalized = email.trim().toLowerCase();
  const path = pathForEmail(normalized);
  try {
    await head(path);
  } catch {
    return { deleted: false, email: normalized };
  }
  await del(path);
  return { deleted: true, email: normalized };
}

function optionalString(parsed: Record<string, unknown>, key: string): string | undefined {
  const v = parsed[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

/**
 * Internal/operator only: load entry payload by exact normalized email for resend.
 */
export async function getWaitlistEntryByEmail(
  email: string
): Promise<WaitlistEntry | null> {
  const normalized = email.trim().toLowerCase();
  const path = pathForEmail(normalized);
  try {
    const result = await get(path, { access: "public" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const lastAt = optionalString(parsed, "last_confirmation_sent_at");
    const count = typeof parsed.confirmation_send_count === "number" ? parsed.confirmation_send_count : undefined;
    return {
      email: String(parsed.email ?? normalized),
      created_at: String(parsed.created_at ?? new Date().toISOString()),
      source: String(parsed.source ?? "beauty"),
      preview_archetype: optionalString(parsed, "preview_archetype"),
      solar_season: optionalString(parsed, "solar_season"),
      name: optionalString(parsed, "name"),
      birthDate: optionalString(parsed, "birthDate"),
      birthPlace: optionalString(parsed, "birthPlace"),
      birthTime: optionalString(parsed, "birthTime"),
      last_confirmation_sent_at: lastAt,
      confirmation_send_count: count,
    };
  } catch {
    return null;
  }
}

/**
 * Update existing waitlist blob with last_confirmation_sent_at and increment confirmation_send_count.
 * Call after a successful send (first or duplicate resend). Preserves all existing fields.
 */
export async function recordConfirmationSent(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const path = pathForEmail(normalized);
  const result = await get(path, { access: "public" });
  if (!result || result.statusCode !== 200 || !result.stream) return;
  const text = await new Response(result.stream).text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return;
  }
  const now = new Date().toISOString();
  const count = typeof parsed.confirmation_send_count === "number" ? parsed.confirmation_send_count + 1 : 1;
  const merged = { ...parsed, last_confirmation_sent_at: now, confirmation_send_count: count };
  await put(path, JSON.stringify(merged), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}
