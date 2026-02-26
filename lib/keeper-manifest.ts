/**
 * Keeper manifest: reusable bundle saved on full-cylinders success.
 * Stored at ligs-keepers/{reportId}.json
 */

import { put, head } from "@vercel/blob";
import { allowBlobWrites } from "./runtime-mode";

export const BLOB_KEEPERS_PREFIX = "ligs-keepers/";
export const BLOB_KEEPERS_DRY_PREFIX = "ligs-keepers-dry/";
export const IDENTITY_SPEC_VERSION = "1.0";

/** Per-asset prompt: exact strings sent to provider (positive, negative, full concatenated). */
export interface KeeperPromptSent {
  positive: string;
  negative: string;
  /** Exact concatenated prompt sent to provider (e.g. "${positive} Avoid: ${negative}."). */
  full: string;
}

export interface KeeperManifest {
  reportId: string;
  primaryArchetype: string;
  secondaryArchetype: string;
  twilightPhase: string;
  sunLonDeg: number;
  marketingDescriptor: {
    tagline: string;
    hitPoints: string[];
    ctaText: string;
    ctaStyle: string;
  };
  prompts: {
    signatures: Array<{ slug: string } & KeeperPromptSent>;
    marketing_background: KeeperPromptSent;
    logo_mark: KeeperPromptSent;
    marketing_card: { headline: string; subhead?: string; cta?: string };
    share_card: KeeperPromptSent;
  };
  urls: {
    signature_0: string;
    signature_1: string;
    signature_2: string;
    marketingBackground: string;
    logoMark: string;
    marketingCard: string;
    shareCard: string;
  };
  createdAt: number;
  identitySpecVersion: string;
}

function useBlob(): boolean {
  return (
    allowBlobWrites &&
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0
  );
}

/**
 * Save keeper manifest to Blob.
 * @param manifest - Keeper manifest data.
 * @param dryRun - If true, write to ligs-keepers-dry/{reportId}.json instead of ligs-keepers/.
 * @returns Public URL or null if Blob not configured.
 */
export async function saveKeeperManifest(
  manifest: KeeperManifest,
  dryRun = false
): Promise<string | null> {
  if (!useBlob()) return null;
  const prefix = dryRun ? BLOB_KEEPERS_DRY_PREFIX : BLOB_KEEPERS_PREFIX;
  const pathname = `${prefix}${manifest.reportId}.json`;
  try {
    const blob = await put(pathname, JSON.stringify(manifest, null, 0), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return blob.url;
  } catch {
    return null;
  }
}

/**
 * Load keeper manifest from Blob.
 * @param reportId - Report ID.
 * @param dry - If true, load from ligs-keepers-dry/ instead of ligs-keepers/.
 * @returns Manifest or null if not found.
 */
export async function loadKeeperManifest(
  reportId: string,
  dry = false
): Promise<KeeperManifest | null> {
  if (!useBlob()) return null;
  const prefix = dry ? BLOB_KEEPERS_DRY_PREFIX : BLOB_KEEPERS_PREFIX;
  const pathname = `${prefix}${reportId}.json`;
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    const text = await res.text();
    return JSON.parse(text) as KeeperManifest;
  } catch {
    return null;
  }
}
