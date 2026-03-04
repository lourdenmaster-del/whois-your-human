/**
 * Exemplar pack storage: Vercel Blob at ligs-exemplars/{archetype}/{version}/
 * Used for landing Examples section (12 archetype packs).
 */

import { put, head } from "@vercel/blob";
import { allowBlobWrites } from "./runtime-mode";
import { log } from "./log";

export const BLOB_EXEMPLARS_PREFIX = "ligs-exemplars/";

function useBlob(): boolean {
  return (
    allowBlobWrites &&
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0
  );
}

export function exemplarPath(archetype: string, version: string, slug: string): string {
  return `${BLOB_EXEMPLARS_PREFIX}${archetype}/${version}/${slug}.png`;
}

export function exemplarManifestPath(archetype: string, version: string): string {
  return `${BLOB_EXEMPLARS_PREFIX}${archetype}/${version}/manifest.json`;
}

/** Archetypes that prefer a newer version when available. Used to roll out v2 for Ignis without overwriting v1. */
export const PREFERRED_ARCHETYPE_VERSIONS: Record<string, string> = {
  Ignispectrum: "v2",
};

/** Canonical Ignis exemplar URL when Blob manifest is missing. Set EXEMPLAR_IGNIS_CANONICAL_URL to override. */
export const IGNIS_CANONICAL_FALLBACK =
  process.env.EXEMPLAR_IGNIS_CANONICAL_URL || process.env.NEXT_PUBLIC_IGNIS_EXEMPLAR_URL || "/exemplars/ignispectrum.png";

/** Resolve version to try: for archetypes in PREFERRED_ARCHETYPE_VERSIONS, prefer that; else use requested. */
export function getPreferredExemplarVersion(archetype: string, requestedVersion: string): string {
  return PREFERRED_ARCHETYPE_VERSIONS[archetype] ?? requestedVersion;
}

/** Save image buffer to exemplar Blob path. Returns public URL or null. */
export async function saveExemplarToBlob(
  pathname: string,
  imageBuffer: ArrayBuffer | Buffer,
  contentType: string = "image/png"
): Promise<string | null> {
  if (!useBlob()) return null;
  const buf =
    imageBuffer instanceof Buffer
      ? imageBuffer
      : Buffer.from(imageBuffer as ArrayBuffer, 0, (imageBuffer as ArrayBuffer).byteLength);
  try {
    const blob = await put(pathname, buf, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    return blob.url;
  } catch (err) {
    log("warn", "exemplar_blob_save_failed", {
      pathname,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Save manifest JSON to exemplar Blob path. Returns public URL or null. */
export async function saveExemplarManifest(
  pathname: string,
  manifest: unknown
): Promise<string | null> {
  if (!useBlob()) return null;
  try {
    const blob = await put(pathname, JSON.stringify(manifest, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return blob.url;
  } catch (err) {
    log("warn", "exemplar_manifest_save_failed", {
      pathname,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Get manifest URL from Blob head. Returns null if not found. */
export async function getExemplarManifestUrl(pathname: string): Promise<string | null> {
  if (!useBlob()) return null;
  try {
    const meta = await head(pathname);
    return meta.url;
  } catch {
    return null;
  }
}

/** Load exemplar manifest JSON by pathname. Returns null if not found. */
export async function loadExemplarManifest(pathname: string): Promise<unknown | null> {
  if (!useBlob()) return null;
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    const text = await res.text();
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Load manifest for archetype, preferring PREFERRED_ARCHETYPE_VERSIONS when set. Tries preferred first, then requested. */
export async function loadExemplarManifestWithPreferred(
  archetype: string,
  requestedVersion: string
): Promise<unknown | null> {
  const preferred = getPreferredExemplarVersion(archetype, requestedVersion);
  const fromPreferred = await loadExemplarManifest(exemplarManifestPath(archetype, preferred));
  if (fromPreferred != null) return fromPreferred;
  if (preferred !== requestedVersion) {
    return loadExemplarManifest(exemplarManifestPath(archetype, requestedVersion));
  }
  return null;
}
