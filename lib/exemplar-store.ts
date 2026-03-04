/**
 * Exemplar pack storage: Vercel Blob at ligs-exemplars/{archetype}/{version}/
 * Used for landing Examples section (12 archetype packs).
 */

import { put, head } from "@vercel/blob";
import { allowBlobWrites } from "./runtime-mode";
import { log } from "./log";

export const BLOB_EXEMPLARS_PREFIX = "ligs-exemplars/";

function isBlobEnabled(): boolean {
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

/** Archetypes that prefer a newer version when available. Ignis always uses v2 (ligs-exemplars/Ignispectrum/v2/manifest.json) even when version=v1 is requested. */
export const PREFERRED_ARCHETYPE_VERSIONS: Record<string, string> = {
  Ignispectrum: "v2",
};

/** Canonical Ignis exemplar URL when Blob manifest cannot be read. Prefer env; only use static when both are missing. */
export const IGNIS_CANONICAL_FALLBACK =
  (process.env.EXEMPLAR_IGNIS_CANONICAL_URL || process.env.NEXT_PUBLIC_IGNIS_EXEMPLAR_URL || "").trim() ||
  "/exemplars/ignispectrum.png";

/** Approved Ignis landing image — v1 exemplar_card. Use on /origin (hero + Examples grid) only. No v2, no placeholder. */
export const IGNIS_LANDING_URL =
  "https://rne9k1g6lgh8e9is.public.blob.vercel-storage.com/ligs-exemplars/Ignispectrum/v1/exemplar_card.png";

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
  if (!isBlobEnabled()) return null;
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
  if (!isBlobEnabled()) return null;
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
  if (!isBlobEnabled()) return null;
  try {
    const meta = await head(pathname);
    return meta.url;
  } catch {
    return null;
  }
}

/** Load exemplar manifest JSON by pathname. Returns null if not found. */
export async function loadExemplarManifest(pathname: string): Promise<unknown | null> {
  if (!isBlobEnabled()) return null;
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

const IGNIS_ARCHETYPE = "Ignispectrum";
const IGNIS_VERSION = "v2";

/** Server-side: load exemplar manifests (same logic as GET /api/exemplars). For landing page SSR to avoid client flicker. */
export async function getExemplarManifestsServer(version: string): Promise<{
  manifests: unknown[];
  ignisImageUrl: string;
}> {
  const { LIGS_ARCHETYPES } = await import("@/src/ligs/archetypes/contract");
  const manifests: unknown[] = [];
  let ignisManifest: unknown = null;

  for (const archetype of LIGS_ARCHETYPES) {
    if (archetype === IGNIS_ARCHETYPE) {
      const ignis = await loadExemplarManifest(exemplarManifestPath(IGNIS_ARCHETYPE, IGNIS_VERSION));
      if (ignis != null) {
        manifests.push(ignis);
        ignisManifest = ignis;
      }
    } else {
      const manifest = await loadExemplarManifestWithPreferred(archetype, version);
      if (manifest != null) manifests.push(manifest);
    }
  }

  if (ignisManifest == null) {
    manifests.push({
      archetype: IGNIS_ARCHETYPE,
      version: IGNIS_VERSION,
      urls: {
        exemplarCard: IGNIS_CANONICAL_FALLBACK,
        exemplar_card: IGNIS_CANONICAL_FALLBACK,
      },
    });
  }

  return { manifests, ignisImageUrl: IGNIS_LANDING_URL };
}
