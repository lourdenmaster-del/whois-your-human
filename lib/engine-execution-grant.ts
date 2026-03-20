/**
 * Single-use execution grants minted after Stripe payment is verified (verify-session).
 * Live OpenAI / engine / image routes require a valid, unconsumed grant in production.
 */

import { get, put } from "@vercel/blob";
import { randomBytes } from "crypto";
import { allowBlobWrites } from "@/lib/runtime-mode";

export const ENGINE_EXECUTION_DEFER_CONSUME_HEADER = "x-ligs-defer-grant-consume";

export interface EngineExecutionGrant {
  token: string;
  stripeSessionId: string;
  reportId?: string;
  prePurchase: boolean;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

const GRANT_PREFIX = "ligs-engine-grants/";

const memoryGrants = new Map<string, EngineExecutionGrant>();

const GRANT_TTL_MS = 24 * 60 * 60 * 1000;

function isBlobEnabled(): boolean {
  return (
    allowBlobWrites &&
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0
  );
}

function grantPath(token: string): string {
  return `${GRANT_PREFIX}${token}.json`;
}

export function isEngineExecutionGateEnforced(): boolean {
  if (process.env.LIGS_ENGINE_GATE === "0" || process.env.LIGS_ENGINE_GATE === "false") {
    return false;
  }
  if (
    process.env.NEXT_PUBLIC_FAKE_PAY === "1" ||
    process.env.NEXT_PUBLIC_FAKE_PAY === "true"
  ) {
    return false;
  }
  if (process.env.NODE_ENV !== "production") {
    return false;
  }
  return true;
}

export function extractExecutionKey(request: Request, body: Record<string, unknown>): string | undefined {
  const h = request.headers.get("x-ligs-execution-key")?.trim();
  if (h) return h;
  const k = body.executionKey;
  return typeof k === "string" && k.trim() ? k.trim() : undefined;
}

export function mintEngineExecutionToken(): string {
  return `exg_${randomBytes(24).toString("base64url")}`;
}

export async function createEngineExecutionGrant(params: {
  stripeSessionId: string;
  reportId?: string;
  prePurchase: boolean;
}): Promise<string> {
  const token = mintEngineExecutionToken();
  const now = Date.now();
  const grant: EngineExecutionGrant = {
    token,
    stripeSessionId: params.stripeSessionId,
    ...(params.reportId ? { reportId: params.reportId } : {}),
    prePurchase: params.prePurchase,
    createdAt: now,
    expiresAt: now + GRANT_TTL_MS,
    consumed: false,
  };
  const payload = JSON.stringify(grant);
  if (isBlobEnabled()) {
    await put(grantPath(token), payload, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } else {
    memoryGrants.set(token, grant);
  }
  return token;
}

async function loadGrant(token: string): Promise<EngineExecutionGrant | null> {
  if (isBlobEnabled()) {
    try {
      const result = await get(grantPath(token), { access: "public" });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as EngineExecutionGrant;
    } catch {
      return null;
    }
  }
  return memoryGrants.get(token) ?? null;
}

async function saveGrant(grant: EngineExecutionGrant): Promise<void> {
  const payload = JSON.stringify(grant);
  if (isBlobEnabled()) {
    await put(grantPath(grant.token), payload, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } else {
    memoryGrants.set(grant.token, grant);
  }
}

/**
 * Throws nothing; returns error message for 403 or null if OK / gate off / dry path.
 */
export async function getEngineExecutionGrantViolation(
  executionKey: string | undefined,
  opts: { dryRun: boolean }
): Promise<string | null> {
  if (!isEngineExecutionGateEnforced() || opts.dryRun) return null;
  if (!executionKey?.trim()) return "EXECUTION_KEY_REQUIRED";
  const grant = await loadGrant(executionKey.trim());
  if (!grant || grant.consumed) return "EXECUTION_KEY_INVALID_OR_CONSUMED";
  if (Date.now() > grant.expiresAt) return "EXECUTION_KEY_EXPIRED";
  return null;
}

export async function consumeEngineExecutionGrant(token: string | undefined): Promise<void> {
  if (!token?.trim() || !isEngineExecutionGateEnforced()) return;
  const grant = await loadGrant(token.trim());
  if (!grant || grant.consumed) return;
  grant.consumed = true;
  await saveGrant(grant);
}
