/**
 * Waitlist storage: Blob-backed with email-hash paths for duplicate detection.
 * Table-like structure: email, created_at, source, preview_archetype, solar_season.
 */

import { put, head, del, get } from "@vercel/blob";
import { createHash } from "crypto";

const BLOB_PREFIX = "ligs-waitlist/entries/";

function emailToKey(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 32);
}

export interface WaitlistEntry {
  email: string;
  created_at: string;
  source: string;
  preview_archetype?: string;
  solar_season?: string;
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
  const payload = {
    email: entry.email.trim().toLowerCase(),
    created_at: entry.created_at,
    source: entry.source,
    ...(entry.preview_archetype && { preview_archetype: entry.preview_archetype }),
    ...(entry.solar_season && { solar_season: entry.solar_season }),
  };
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
    return {
      email: String(parsed.email ?? normalized),
      created_at: String(parsed.created_at ?? new Date().toISOString()),
      source: String(parsed.source ?? "beauty"),
      preview_archetype:
        typeof parsed.preview_archetype === "string"
          ? parsed.preview_archetype
          : undefined,
      solar_season:
        typeof parsed.solar_season === "string" ? parsed.solar_season : undefined,
    };
  } catch {
    return null;
  }
}
