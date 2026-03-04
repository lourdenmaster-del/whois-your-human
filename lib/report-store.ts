/**
 * Report storage: Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * otherwise in-memory (for local dev without Blob).
 * Also stores E.V.E. Beauty Profiles and generated imagery in Blob.
 *
 * Storage key format (must match for write and read):
 * - Blob: pathname = BLOB_PREFIX + reportId + ".json" (e.g. ligs-reports/{reportId}.json)
 * - Memory: key = reportId
 * GET /api/report/[reportId] reads via getReport(reportId) using this same format.
 */

import { put, head, list } from "@vercel/blob";
import { allowBlobWrites } from "./runtime-mode";
import type { VectorZero } from "./vector-zero";
import type { BeautyProfile } from "./eve-spec";
import { log } from "./log";

export type StoredReport = {
  full_report: string;
  emotional_snippet: string;
  image_prompts: string[];
  vector_zero?: VectorZero;
  createdAt: number;
};

export const BLOB_PREFIX = "ligs-reports/";
export const BLOB_BEAUTY_PREFIX = "ligs-beauty/";
export const BLOB_IMAGES_PREFIX = "ligs-images/";

/** Pathname for a report in Blob; same key format used by saveReport and getReport. */
export function reportBlobPathname(reportId: string): string {
  return `${BLOB_PREFIX}${reportId}.json`;
}

// In-memory fallback when no Blob token (e.g. local dev)
const memoryStore = new Map<string, StoredReport>();

// TEMPORARY: safety brake — limit retries to 1 for generation flow diagnosis
const SAVE_MAX_RETRIES = 1;
const SAVE_RETRY_DELAY_MS = 500;
const VERIFY_READ_MAX_RETRIES = 1;
const VERIFY_READ_DELAY_MS = 200;

function isTransientStorageError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /network|timeout|econnreset|econnrefused|503|502|429|rate limit/i.test(msg) ||
    (err as { code?: string }).code === "ECONNRESET" ||
    (err as { code?: string }).code === "ETIMEDOUT"
  );
}

/** Extract structured error metadata for report_blob_write_failed logs. */
function extractBlobErrorMeta(
  err: unknown,
  reportId: string,
  payload: StoredReport
): {
  errorMessage: string;
  errorName: string;
  stack: string | undefined;
  responseStatus?: number;
  responseBody?: string;
  fullReportChars: number;
  payloadJsonChars: number;
} {
  const fullReportStr = typeof payload.full_report === "string" ? payload.full_report : "";
  const payloadJson = JSON.stringify(payload);
  const base = {
    errorMessage: err instanceof Error ? err.message : String(err),
    errorName: err instanceof Error ? err.name : "unknown",
    stack: err instanceof Error ? err.stack : undefined,
    fullReportChars: fullReportStr.length,
    payloadJsonChars: payloadJson.length,
  };
  const e = err as { response?: Response; status?: number; body?: string };
  if (e?.response && typeof e.response === "object") {
    const res = e.response as Response;
    return {
      ...base,
      responseStatus: res.status,
      responseBody: undefined, // avoid logging large bodies; status is usually enough
    };
  }
  if (typeof e?.status === "number") {
    return { ...base, responseStatus: e.status };
  }
  return base;
}

/** For debug/test: where reports are stored and how to fetch. */
export function getStorageInfo(): {
  storage: "blob" | "memory";
  blobPathnamePattern: string;
  fetchHint: string;
  inMemoryCount: number;
} {
  const useBlobStorage = isBlobEnabled();
  return {
    storage: useBlobStorage ? "blob" : "memory",
    blobPathnamePattern: useBlobStorage ? `${BLOB_PREFIX}{reportId}.json` : "",
    fetchHint: `GET /api/report/{reportId} returns the report. Report is stored in ${useBlobStorage ? "Vercel Blob" : "process memory"} at ${useBlobStorage ? BLOB_PREFIX + "{reportId}.json" : "memoryStore[reportId]"}.`,
    inMemoryCount: memoryStore.size,
  };
}

/** For debug: list Blob pathnames when using Blob (so we can show where reports are). */
export async function listBlobReportPathnames(): Promise<string[]> {
  if (!isBlobEnabled()) return [];
  const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 20 });
  return blobs.map((b) => b.pathname);
}

/** List Beauty Profile pathnames in Blob (ligs-beauty/{reportId}.json). */
export async function listBlobBeautyPathnames(): Promise<string[]> {
  if (!isBlobEnabled()) return [];
  const { blobs } = await list({ prefix: BLOB_BEAUTY_PREFIX, limit: 50 });
  return blobs.map((b) => b.pathname);
}

/** List Beauty Profiles with upload metadata, sorted by most recent first. */
export async function listBlobBeautyProfilesSorted(limit = 20): Promise<Array<{ pathname: string; uploadedAt?: Date }>> {
  if (!isBlobEnabled()) return [];
  const { blobs } = await list({ prefix: BLOB_BEAUTY_PREFIX, limit: 50 });
  const withMeta = blobs.map((b) => ({
    pathname: b.pathname,
    uploadedAt: (b as { uploadedAt?: Date }).uploadedAt,
  }));
  withMeta.sort((a, b) => {
    const ta = a.uploadedAt?.getTime() ?? 0;
    const tb = b.uploadedAt?.getTime() ?? 0;
    return tb - ta; // descending (most recent first)
  });
  return withMeta.slice(0, limit);
}

/** For debug: list in-memory report IDs when not using Blob. */
export function getMemoryReportIds(): string[] {
  if (isBlobEnabled()) return [];
  return Array.from(memoryStore.keys());
}

function isBlobEnabled(): boolean {
  return (
    allowBlobWrites &&
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0
  );
}

export async function saveReport(
  reportId: string,
  data: Omit<StoredReport, "createdAt">,
  context?: { requestId?: string }
): Promise<void> {
  const payload: StoredReport = {
    ...data,
    createdAt: Date.now(),
  };

  if (isBlobEnabled()) {
    const blobKey = reportBlobPathname(reportId);
    try {
      const putResult = await put(blobKey, JSON.stringify(payload), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });
      const providerResult = (putResult as { status?: unknown })?.status ?? putResult ?? "unknown";
      log("info", "report_blob_written", {
        requestId: context?.requestId ?? "no-request-id",
        reportId,
        storage: "blob",
        blobKey,
        providerResult,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      log("error", "report_blob_write_failed", {
        requestId: context?.requestId ?? "no-request-id",
        reportId,
        storage: "blob",
        blobKey,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : "no-stack",
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  } else {
    memoryStore.set(reportId, payload);
  }
}

/**
 * Save report with retries on transient errors, then verify by reading back.
 * Returns { ok: true } only when the write is confirmed (read returns the report).
 * Use this in the engine so we never return status: "ok" with a reportId that isn't stored.
 */
export async function saveReportAndConfirm(
  reportId: string,
  data: Omit<StoredReport, "createdAt">,
  log?: (level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) => void,
  context?: { requestId?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const noop = () => {};
  const logger = log ?? noop;
  const full_report = data.full_report ?? "";
  const fullReportLen = typeof full_report === "string" ? full_report.length : 0;
  logger("info", "report_pre_save_diag", {
    reportId,
    keys: Object.keys(data),
    full_report_type: typeof full_report,
    full_report_length: fullReportLen,
  });
  if (!full_report || String(full_report).trim().length < 500) {
    logger("error", "REPORT_SAVE_REFUSED_EMPTY_FULL_REPORT", {
      reportId,
      full_report_length: fullReportLen,
    });
    return { ok: false, error: "REPORT_SAVE_REFUSED_EMPTY_FULL_REPORT" };
  }
  const payload: StoredReport = {
    ...data,
    createdAt: Date.now(),
  };

  if (!isBlobEnabled()) {
    memoryStore.set(reportId, payload);
    const verified = memoryStore.get(reportId);
    if (verified && verified.full_report === payload.full_report) {
      return { ok: true };
    }
    logger("error", "Report in-memory verify failed", { reportId });
    return { ok: false, error: "In-memory verify failed" };
  }

  const pathname = reportBlobPathname(reportId);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= SAVE_MAX_RETRIES; attempt++) {
    try {
      const putResult = await put(pathname, JSON.stringify(payload), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });
      lastErr = undefined;
      const blobKey = reportBlobPathname(reportId);
      const providerResult = (putResult as { status?: unknown })?.status ?? putResult ?? "unknown";
      logger("info", "report_blob_written", {
        requestId: context?.requestId ?? "no-request-id",
        reportId,
        storage: "blob",
        blobKey,
        providerResult,
        timestamp: new Date().toISOString(),
      });
      break;
    } catch (err) {
      lastErr = err;
      if (attempt < SAVE_MAX_RETRIES && isTransientStorageError(err)) {
        const delay = SAVE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        logger("warn", "Report storage transient error, retrying", {
          reportId,
          attempt,
          maxRetries: SAVE_MAX_RETRIES,
          delayMs: delay,
          message: err instanceof Error ? err.message : String(err),
        });
        await new Promise((r) => setTimeout(r, delay));
      } else {
        const errMeta = extractBlobErrorMeta(err, reportId, payload);
        logger("error", "report_blob_write_failed", {
          requestId: context?.requestId ?? "no-request-id",
          reportId,
          storage: "blob",
          blobKey: reportBlobPathname(reportId),
          error: errMeta.errorMessage,
          errorName: errMeta.errorName,
          stack: errMeta.stack,
          responseStatus: errMeta.responseStatus,
          responseBody: errMeta.responseBody,
          fullReportChars: errMeta.fullReportChars,
          payloadJsonChars: errMeta.payloadJsonChars,
          attempt,
          timestamp: new Date().toISOString(),
        });
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Report storage write failed",
        };
      }
    }
  }

  if (lastErr !== undefined) {
    const errMeta = extractBlobErrorMeta(lastErr, reportId, payload);
    logger("error", "report_blob_write_failed", {
      requestId: context?.requestId ?? "no-request-id",
      reportId,
      storage: "blob",
      blobKey: reportBlobPathname(reportId),
      error: errMeta.errorMessage,
      errorName: errMeta.errorName,
      stack: errMeta.stack,
      responseStatus: errMeta.responseStatus,
      responseBody: errMeta.responseBody,
      fullReportChars: errMeta.fullReportChars,
      payloadJsonChars: errMeta.payloadJsonChars,
      attempt: SAVE_MAX_RETRIES,
      timestamp: new Date().toISOString(),
    });
    return {
      ok: false,
      error: errMeta.errorMessage,
    };
  }

  // Verify: read back from the same storage/key format GET /api/report/{id} uses.
  // Short read-after-write retry for eventual consistency (Blob/cache).
  try {
    for (let r = 0; r < VERIFY_READ_MAX_RETRIES; r++) {
      const readBack = await getReport(reportId);
      const readBackKeys = readBack ? Object.keys(readBack) : [];
      const readBackLen = readBack?.full_report != null ? String(readBack.full_report).length : undefined;
      logger("info", "report_post_read_diag", {
        reportId,
        attempt: r + 1,
        keys: readBackKeys,
        full_report_length: readBackLen,
      });
      if (!readBack || !readBack.full_report || String(readBack.full_report).trim().length < 500) {
        logger("error", "REPORT_VERIFY_READ_MISSING_FULL_REPORT", {
          reportId,
          readBackKeys,
          full_report_length: readBackLen,
        });
        return { ok: false, error: "REPORT_VERIFY_READ_MISSING_FULL_REPORT" };
      }
      if (readBack.full_report === payload.full_report) {
        return { ok: true };
      }
      if (r < VERIFY_READ_MAX_RETRIES - 1) {
        const delay = VERIFY_READ_DELAY_MS * (r + 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
    logger("error", "Report storage verify failed: read-back missing or mismatch", {
      reportId,
      pathname,
    });
    return { ok: false, error: "Report write could not be verified" };
  } catch (err) {
    logger("error", "Report storage verify read failed", {
      reportId,
      message: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "Report verify read failed" };
  }
}

export async function getReport(reportId: string): Promise<StoredReport | undefined> {
  if (isBlobEnabled()) {
    const pathname = reportBlobPathname(reportId);
    try {
      const meta = await head(pathname);
      const res = await fetch(meta.url);
      if (!res.ok) return undefined;
      const text = await res.text();
      return JSON.parse(text) as StoredReport;
    } catch {
      return undefined;
    }
  }
  return memoryStore.get(reportId);
}

/**
 * Save E.V.E. Beauty Profile to Blob (ligs-beauty/{reportId}.json). No-op if Blob not configured.
 * When BLOB_READ_WRITE_TOKEN is not set, Beauty profiles are not stored; GET /api/report/[reportId]/beauty
 * will return 404 in that configuration.
 */
export async function saveBeautyProfile(reportId: string, profile: BeautyProfile): Promise<void> {
  if (!isBlobEnabled()) return;
  const pathname = `${BLOB_BEAUTY_PREFIX}${reportId}.json`;
  await put(pathname, JSON.stringify(profile), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

/** Get E.V.E. Beauty Profile from Blob by reportId. */
export async function getBeautyProfile(reportId: string): Promise<BeautyProfile | undefined> {
  if (!isBlobEnabled()) return undefined;
  const pathname = `${BLOB_BEAUTY_PREFIX}${reportId}.json`;
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url);
    if (!res.ok) return undefined;
    const text = await res.text();
    return JSON.parse(text) as BeautyProfile;
  } catch {
    return undefined;
  }
}

/** Get stored image URL from Blob if it exists (reportId + slug). */
export async function getImageUrlFromBlob(reportId: string, slug: string): Promise<string | null> {
  if (!isBlobEnabled()) return null;
  for (const ext of ["png", "jpg"]) {
    const pathname = `${BLOB_IMAGES_PREFIX}${reportId}/${slug}.${ext}`;
    try {
      const meta = await head(pathname);
      return meta.url;
    } catch {
      // try next ext
    }
  }
  return null;
}

/** Upload image buffer to Blob and return public URL. Returns null if Blob not configured. */
export async function saveImageToBlob(
  reportId: string,
  slug: string,
  imageBuffer: ArrayBuffer,
  contentType: string = "image/png"
): Promise<string | null> {
  if (!isBlobEnabled()) return null;
  const ext = contentType.includes("png") ? "png" : "jpg";
  const pathname = `${BLOB_IMAGES_PREFIX}${reportId}/${slug}.${ext}`;
  const blob = await put(pathname, imageBuffer, {
    access: "public",
    addRandomSuffix: false,
    contentType,
  });
  return blob.url;
}
