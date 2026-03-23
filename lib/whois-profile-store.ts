/**
 * WHOIS-owned profile store. Canonical source for save/load.
 * Uses ligs-beauty/ Blob prefix for backward compatibility.
 *
 * In-memory fallback when BLOB_READ_WRITE_TOKEN is unset (local dev):
 * profiles persist in process memory so free/dev submit → /whois/view works
 * without paid Blob. Same process = report-store + profile-store share dev storage.
 *
 * CANONICAL WHOIS FLOW
 * This file is part of the active WHOIS human→agent system.
 * Do not introduce beauty-named dependencies here.
 */

import { put, head } from "@vercel/blob";
import { allowBlobWrites } from "@/lib/runtime-mode";
import { assertWhoisProfileV1 } from "@/lib/whois-profile-schema";
import type { WhoisProfileV1 } from "@/lib/whois-profile-schema";
import { log } from "@/lib/log";
import { BLOB_BEAUTY_PREFIX } from "@/lib/report-store";

function isBlobEnabled(): boolean {
  return (
    allowBlobWrites &&
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0
  );
}

const memoryProfileStore = new Map<string, WhoisProfileV1>();

export async function saveWhoisProfileV1(
  reportId: string,
  profile: WhoisProfileV1,
  requestId: string
): Promise<void> {
  log("info", "whois_profile_save_called", { requestId, reportId });
  assertWhoisProfileV1(profile);
  const isDev = process.env.NODE_ENV !== "production";
  const isVercel = process.env.VERCEL === "1";

  if (!allowBlobWrites) {
    memoryProfileStore.set(reportId, profile);
    log("info", "whois_profile_save_memory", {
      requestId,
      reportId,
      storage: "memory",
      reason: "allowBlobWrites_false",
      memorySize: memoryProfileStore.size,
    });
    return;
  }
  if (!isBlobEnabled()) {
    if (isVercel) {
      log("error", "whois_profile_save_blocked_no_blob", {
        requestId,
        reportId,
        reason: "BLOB_READ_WRITE_TOKEN required on Vercel; in-memory does not persist across serverless invocations",
      });
      throw new Error("BEAUTY_PROFILE_STORAGE_UNAVAILABLE");
    }
    memoryProfileStore.set(reportId, profile);
    log("info", "whois_profile_save_memory", {
      requestId,
      reportId,
      storage: "memory",
      reason: "isBlobEnabled_false",
      memorySize: memoryProfileStore.size,
    });
    return;
  }
  const pathname = `${BLOB_BEAUTY_PREFIX}${reportId}.json`;
  log("info", "whois_profile_save_blob_start", { requestId, reportId });
  try {
    await put(pathname, JSON.stringify(profile), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    if (isDev) {
      memoryProfileStore.set(reportId, profile);
      log("info", "whois_profile_save_dev_dual_write", {
        requestId,
        reportId,
        memorySize: memoryProfileStore.size,
      });
    }
    log("info", "whois_profile_save_end", { requestId, reportId });
  } catch (e) {
    if (isDev && !isVercel) {
      memoryProfileStore.set(reportId, profile);
      log("warn", "whois_profile_save_blob_failed_fallback_memory", {
        requestId,
        reportId,
        error: e instanceof Error ? e.message : String(e),
        memorySize: memoryProfileStore.size,
      });
    } else {
      throw new Error("BEAUTY_PROFILE_WRITE_FAILED");
    }
  }
}

export async function loadWhoisProfileV1(
  reportId: string,
  requestId: string
): Promise<WhoisProfileV1> {
  const isDev = process.env.NODE_ENV !== "production";
  const isVercel = process.env.VERCEL === "1";
  log("info", "whois_profile_load_start", {
    requestId,
    reportId,
    isBlobEnabled: isBlobEnabled(),
    memorySize: memoryProfileStore.size,
    isDev,
    isVercel,
  });
  const fromMemory = memoryProfileStore.get(reportId);
  if (fromMemory) {
    log("info", "whois_profile_load_memory", { requestId, reportId, storage: "memory" });
    return fromMemory;
  }
  if (!isBlobEnabled()) {
    log("info", "whois_profile_load_memory_miss", { requestId, reportId });
    throw new Error("BEAUTY_PROFILE_NOT_FOUND");
  }
  const pathname = `${BLOB_BEAUTY_PREFIX}${reportId}.json`;
  let text: string;
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url);
    if (!res.ok) {
      throw new Error("BEAUTY_PROFILE_NOT_FOUND");
    }
    text = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "BEAUTY_PROFILE_NOT_FOUND" || msg === "BEAUTY_PROFILE_PARSE_FAILED" || msg === "BEAUTY_PROFILE_SCHEMA_MISMATCH") {
      throw e;
    }
    throw new Error("BEAUTY_PROFILE_NOT_FOUND");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("BEAUTY_PROFILE_PARSE_FAILED");
  }
  try {
    assertWhoisProfileV1(parsed);
  } catch {
    throw new Error("BEAUTY_PROFILE_SCHEMA_MISMATCH");
  }
  log("info", "whois_profile_load_end", { requestId, reportId });
  return parsed as WhoisProfileV1;
}
