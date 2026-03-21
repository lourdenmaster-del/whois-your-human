/**
 * Agent stance storage — Blob-backed counts + per-IP cooldown.
 * POST /api/agent/stance records endorse/decline/abstain.
 * GET /api/agent/stance returns aggregated counts.
 */

import { put, get, head } from "@vercel/blob";
import { createHash } from "crypto";

const BLOB_PREFIX = "ligs-agent-stance/";
const STATE_PATH = `${BLOB_PREFIX}state.json`;
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1 stance per IP per 24h
const MAX_RATIONALE_LEN = 500;

export type Stance = "endorse" | "decline" | "abstain";

export interface StanceCounts {
  endorse: number;
  decline: number;
  abstain: number;
}

const DEFAULT_COUNTS: StanceCounts = { endorse: 0, decline: 0, abstain: 0 };

function ipToHash(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export function getIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "anonymous";
}

/** Read current counts. Returns zeros when no state exists. */
export async function getStanceCounts(): Promise<StanceCounts> {
  try {
    const result = await get(STATE_PATH, { access: "public" });
    if (!result || result.statusCode !== 200 || !result.stream)
      return { ...DEFAULT_COUNTS };
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      endorse: Math.max(0, Number(parsed.endorse) || 0),
      decline: Math.max(0, Number(parsed.decline) || 0),
      abstain: Math.max(0, Number(parsed.abstain) || 0),
    };
  } catch {
    return { ...DEFAULT_COUNTS };
  }
}

/** Check if IP has submitted within cooldown window. Returns true if allowed. */
async function isCooldownExpired(ipHash: string): Promise<boolean> {
  const path = `${BLOB_PREFIX}cooldown/${ipHash}.json`;
  try {
    await head(path);
  } catch {
    return true;
  }
  try {
    const result = await get(path, { access: "public" });
    if (!result || result.statusCode !== 200 || !result.stream) return true;
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text) as { lastStanceAt?: number };
    const last = parsed.lastStanceAt ?? 0;
    return Date.now() - last >= COOLDOWN_MS;
  } catch {
    return true;
  }
}

/** Record a stance. Returns counts on success, or reason for rejection. Never throws. */
export async function recordStance(
  ip: string,
  stance: Stance,
  rationale?: string
): Promise<
  | { ok: true; counts: StanceCounts }
  | { ok: false; reason: "COOLDOWN"; retryAfterSec?: number }
  | { ok: false; reason: "BLOB_ERROR"; message: string }
> {
  const ipHash = ipToHash(ip);
  const expired = await isCooldownExpired(ipHash);
  if (!expired) {
    const cooldownResult = await get(
      `${BLOB_PREFIX}cooldown/${ipHash}.json`,
      { access: "public" }
    );
    let retryAfterSec: number | undefined;
    if (cooldownResult?.statusCode === 200 && cooldownResult?.stream) {
      const text = await new Response(cooldownResult.stream).text();
      const parsed = JSON.parse(text) as { lastStanceAt?: number };
      const last = parsed.lastStanceAt ?? 0;
      retryAfterSec = Math.ceil((last + COOLDOWN_MS - Date.now()) / 1000);
    }
    return { ok: false, reason: "COOLDOWN", retryAfterSec };
  }

  const counts = await getStanceCounts();
  counts[stance] += 1;

  const rationaleTrimmed =
    typeof rationale === "string" && rationale.trim()
      ? rationale.trim().slice(0, MAX_RATIONALE_LEN)
      : undefined;

  try {
    await put(STATE_PATH, JSON.stringify(counts), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      allowOverwrite: true,
    });
    await put(
      `${BLOB_PREFIX}cooldown/${ipHash}.json`,
      JSON.stringify({ lastStanceAt: Date.now() }),
      {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
        allowOverwrite: true,
      }
    );
  } catch (err) {
    console.error("[agent-stance] recordStance failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: "BLOB_ERROR", message: msg.slice(0, 200) };
  }

  return { ok: true, counts };
}
