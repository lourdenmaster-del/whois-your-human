/**
 * Idempotency store: Blob-backed cache at ligs-runs/{route}/{idempotencyKey}.json
 * Prevents duplicate OpenAI spend on retries or double-clicks.
 */

import { createHash } from "crypto";
import { put, head } from "@vercel/blob";
import { allowBlobWrites } from "./runtime-mode";
import { log } from "./log";

export const IDEMPOTENCY_PREFIX = "ligs-runs/";

export type IdempotencyRoute =
  | "engine-generate"
  | "engine"
  | "marketing-generate"
  | "image-generate";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidIdempotencyKey(key: unknown): key is string {
  return typeof key === "string" && UUID_REGEX.test(key.trim());
}

/**
 * Derive a deterministic UUID from a base idempotency key + suffix.
 * Used for sub-steps (marketing_background, share_card) so replays hit cache.
 */
export function deriveIdempotencyKey(base: string, suffix: string): string {
  const hash = createHash("sha256").update(base + "\0" + suffix).digest("hex");
  const h = hash.slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function useBlob(): boolean {
  return (
    allowBlobWrites &&
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0
  );
}

function blobPathname(route: IdempotencyRoute, key: string): string {
  return `${IDEMPOTENCY_PREFIX}${route}/${key}.json`;
}

// In-memory fallback when no Blob
const memoryStore = new Map<string, unknown>();

/**
 * Returns stored result for the given route and idempotency key, or null if none.
 */
export async function getIdempotentResult<T = unknown>(
  route: IdempotencyRoute,
  key: string,
  context?: { requestId?: string }
): Promise<T | null> {
  const pathname = blobPathname(route, key);

  if (!useBlob()) {
    const mem = memoryStore.get(pathname);
    return mem != null ? (mem as T) : null;
  }

  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    const text = await res.text();
    const parsed = JSON.parse(text) as T;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Stores the result for the given route and idempotency key.
 */
export async function setIdempotentResult(
  route: IdempotencyRoute,
  key: string,
  payload: unknown,
  context?: { requestId?: string }
): Promise<void> {
  const pathname = blobPathname(route, key);

  if (!useBlob()) {
    memoryStore.set(pathname, payload);
    return;
  }

  try {
    await put(pathname, JSON.stringify(payload), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    log("info", "idempotency_stored", {
      requestId: context?.requestId ?? "no-request-id",
      route,
      key: key.slice(0, 8) + "...",
    });
  } catch (err) {
    log("warn", "idempotency_store_failed", {
      requestId: context?.requestId ?? "no-request-id",
      route,
      error: err instanceof Error ? err.message : String(err),
    });
    // Non-fatal: we still return the result; next duplicate will re-run
  }
}
