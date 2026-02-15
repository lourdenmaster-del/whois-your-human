/**
 * Report storage: Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * otherwise in-memory (for local dev without Blob).
 * Also stores E.V.E. Beauty Profiles and generated imagery in Blob.
 */

import { put, head, list } from "@vercel/blob";
import type { VectorZero } from "./vector-zero";
import type { BeautyProfile } from "./eve-spec";

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

// In-memory fallback when no Blob token (e.g. local dev)
const memoryStore = new Map<string, StoredReport>();

/** For debug/test: where reports are stored and how to fetch. */
export function getStorageInfo(): {
  storage: "blob" | "memory";
  blobPathnamePattern: string;
  fetchHint: string;
  inMemoryCount: number;
} {
  const useBlobStorage = useBlob();
  return {
    storage: useBlobStorage ? "blob" : "memory",
    blobPathnamePattern: useBlobStorage ? `${BLOB_PREFIX}{reportId}.json` : "",
    fetchHint: `GET /api/report/{reportId} returns the report. Report is stored in ${useBlobStorage ? "Vercel Blob" : "process memory"} at ${useBlobStorage ? BLOB_PREFIX + "{reportId}.json" : "memoryStore[reportId]"}.`,
    inMemoryCount: memoryStore.size,
  };
}

/** For debug: list Blob pathnames when using Blob (so we can show where reports are). */
export async function listBlobReportPathnames(): Promise<string[]> {
  if (!useBlob()) return [];
  const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 20 });
  return blobs.map((b) => b.pathname);
}

/** For debug: list in-memory report IDs when not using Blob. */
export function getMemoryReportIds(): string[] {
  if (useBlob()) return [];
  return Array.from(memoryStore.keys());
}

function useBlob(): boolean {
  return typeof process.env.BLOB_READ_WRITE_TOKEN === "string" && process.env.BLOB_READ_WRITE_TOKEN.length > 0;
}

export async function saveReport(
  reportId: string,
  data: Omit<StoredReport, "createdAt">
): Promise<void> {
  const payload: StoredReport = {
    ...data,
    createdAt: Date.now(),
  };

  if (useBlob()) {
    const pathname = `${BLOB_PREFIX}${reportId}.json`;
    await put(pathname, JSON.stringify(payload), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } else {
    memoryStore.set(reportId, payload);
  }
}

export async function getReport(reportId: string): Promise<StoredReport | undefined> {
  if (useBlob()) {
    const pathname = `${BLOB_PREFIX}${reportId}.json`;
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
  if (!useBlob()) return;
  const pathname = `${BLOB_BEAUTY_PREFIX}${reportId}.json`;
  await put(pathname, JSON.stringify(profile), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

/** Get E.V.E. Beauty Profile from Blob by reportId. */
export async function getBeautyProfile(reportId: string): Promise<BeautyProfile | undefined> {
  if (!useBlob()) return undefined;
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
  if (!useBlob()) return null;
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
  if (!useBlob()) return null;
  const ext = contentType.includes("png") ? "png" : "jpg";
  const pathname = `${BLOB_IMAGES_PREFIX}${reportId}/${slug}.${ext}`;
  const blob = await put(pathname, imageBuffer, {
    access: "public",
    addRandomSuffix: false,
    contentType,
  });
  return blob.url;
}
