/**
 * Archetype → public asset URL mapping.
 * Folders: public/{archetype}-images/
 * Files: {archetype}-prime1.png, {archetype}-prime2.png, {archetype}-prime3.png
 * Contract: prime1=marketingBackground, prime2=exemplarCard, prime3=shareCard.
 *
 * Deterministic rotation (prime4+):
 * - prime4, prime7, prime10... are alternates for marketingBackground
 * - prime5, prime8, prime11... are alternates for exemplarCard
 * - prime6, prime9, prime12... are alternates for shareCard
 * When multiple primes exist for a slot, selection uses hash(seed) % pool.length.
 * arc images folders are NOT wired; only {archetype}-images/ prime assets are used.
 */

import { LIGS_ARCHETYPES } from "@/lib/archetypes";

export interface ArchetypePublicAssetUrls {
  marketingBackground: string;
  exemplarCard: string;
  shareCard: string;
}

/** Slot → base prime index. Legacy contract. */
const SLOT_TO_BASE_PRIME: Record<string, number> = {
  marketingBackground: 1,
  exemplarCard: 2,
  shareCard: 3,
};

/**
 * Available prime indices per archetype (from public folder audit).
 * Used for deterministic rotation; only primes that exist on disk.
 */
const AVAILABLE_PRIMES_BY_ARCHETYPE: Record<string, number[]> = {
  Aequilibris: [1, 2, 3, 4],
  Duplicaris: [1, 2, 3, 4],
  Fluxionis: [1, 2, 3, 4],
  Ignispectrum: [1, 2, 3, 4],
  Innovaris: [1, 2, 3, 4, 5, 6, 7, 8],
  Obscurion: [1, 2, 3, 4],
  Precisura: [1, 2, 3, 4],
  Radiantis: [1, 2, 3, 4],
  Stabiliora: [1, 2, 3, 4],
  Structoris: [1, 2, 3, 4],
  Tenebris: [1, 2, 3, 4],
  Vectoris: [1, 2, 3, 4],
};

/** Folder names in public/ (canonical: {archetype}-images). */
const ARCHETYPE_FOLDER_MAP: Record<string, { folder: string; files: { marketingBackground: string; exemplarCard: string; shareCard: string } }> = {
  Aequilibris: { folder: "aequilibris-images", files: { marketingBackground: "aequilibris-prime1.png", exemplarCard: "aequilibris-prime2.png", shareCard: "aequilibris-prime3.png" } },
  Duplicaris: { folder: "duplicaris-images", files: { marketingBackground: "duplicaris-prime1.png", exemplarCard: "duplicaris-prime2.png", shareCard: "duplicaris-prime3.png" } },
  Fluxionis: { folder: "fluxionis-images", files: { marketingBackground: "fluxionis-prime1.png", exemplarCard: "fluxionis-prime2.png", shareCard: "fluxionis-prime3.png" } },
  Ignispectrum: { folder: "ignispectrum-images", files: { marketingBackground: "ignispectrum-prime1.png", exemplarCard: "ignispectrum-prime2.png", shareCard: "ignispectrum-prime3.png" } },
  Innovaris: { folder: "innovaris-images", files: { marketingBackground: "innovaris-prime1.png", exemplarCard: "innovaris-prime2.png", shareCard: "innovaris-prime3.png" } },
  Obscurion: { folder: "obscurion-images", files: { marketingBackground: "obscurion-prime1.png", exemplarCard: "obscurion-prime2.png", shareCard: "obscurion-prime3.png" } },
  Precisura: { folder: "precisura-images", files: { marketingBackground: "precisura-prime1.png", exemplarCard: "precisura-prime2.png", shareCard: "precisura-prime3.png" } },
  Radiantis: { folder: "radiantis-images", files: { marketingBackground: "radiantis-prime1.png", exemplarCard: "radiantis-prime2.png", shareCard: "radiantis-prime3.png" } },
  Stabiliora: { folder: "stabiliora-images", files: { marketingBackground: "stabiliora-prime1.png", exemplarCard: "stabiliora-prime2.png", shareCard: "stabiliora-prime3.png" } },
  Structoris: { folder: "structoris-images", files: { marketingBackground: "structoris-prime1.png", exemplarCard: "structoris-prime2.png", shareCard: "structoris-prime3.png" } },
  Tenebris: { folder: "tenebris-images", files: { marketingBackground: "tenebris-prime1.png", exemplarCard: "tenebris-prime2.png", shareCard: "tenebris-prime3.png" } },
  Vectoris: { folder: "vectoris-images", files: { marketingBackground: "vectoris-prime1.png", exemplarCard: "vectoris-prime2.png", shareCard: "vectoris-prime3.png" } },
};

function buildPublicUrl(folder: string, file: string): string {
  const encodedFolder = encodeURIComponent(folder);
  return `/${encodedFolder}/${file}`;
}

/** Simple deterministic string hash for rotation seed. */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Primes in the same slot family: marketing=1,4,7,... exemplar=2,5,8,... share=3,6,9,...
 */
function getPrimesForSlot(available: number[], basePrime: number): number[] {
  return available.filter((p) => (p - basePrime) % 3 === 0).sort((a, b) => a - b);
}

/**
 * Get a single public asset URL for an archetype slot with deterministic rotation.
 * When multiple prime variants exist for the slot, picks one via hash(seed) % pool.length.
 * Falls back to legacy prime if no alternates. Returns null if archetype not configured.
 */
export function getArchetypePublicAssetUrlWithRotation(
  archetype: string,
  slot: "marketingBackground" | "exemplarCard" | "shareCard",
  seed: string
): string | null {
  const entry = ARCHETYPE_FOLDER_MAP[archetype];
  const available = AVAILABLE_PRIMES_BY_ARCHETYPE[archetype];
  if (!entry || !available) return null;

  const basePrime = SLOT_TO_BASE_PRIME[slot] ?? 1;
  const pool = getPrimesForSlot(available, basePrime);
  const prime = pool.length > 0 ? pool[hashSeed(seed) % pool.length]! : basePrime;

  const prefix = FILE_PREFIX_OVERRIDE[archetype] ?? entry.folder.replace(/-images$/, "");
  const file = `${prefix}-prime${prime}.png`;
  return buildPublicUrl(entry.folder, file);
}

/**
 * Get full public asset URLs for an archetype with deterministic rotation per slot.
 * Each slot uses seed + slot for variety. Returns null if archetype not configured.
 */
export function getArchetypePublicAssetUrlsWithRotation(
  archetype: string,
  seed: string
): ArchetypePublicAssetUrls | null {
  const slots: ("marketingBackground" | "exemplarCard" | "shareCard")[] = [
    "marketingBackground",
    "exemplarCard",
    "shareCard",
  ];
  const urls: ArchetypePublicAssetUrls = { marketingBackground: "", exemplarCard: "", shareCard: "" };
  for (const slot of slots) {
    const url = getArchetypePublicAssetUrlWithRotation(archetype, slot, `${seed}:${slot}`);
    if (!url) return null;
    urls[slot] = url;
  }
  return urls;
}

/** Get public asset URLs for an archetype. Returns null if not configured. */
export function getArchetypePublicAssetUrls(archetype: string): ArchetypePublicAssetUrls | null {
  const entry = ARCHETYPE_FOLDER_MAP[archetype];
  if (!entry) return null;
  return {
    marketingBackground: buildPublicUrl(entry.folder, entry.files.marketingBackground),
    exemplarCard: buildPublicUrl(entry.folder, entry.files.exemplarCard),
    shareCard: buildPublicUrl(entry.folder, entry.files.shareCard),
  };
}

/** Check if an archetype has public assets configured. */
export function hasArchetypePublicAssets(archetype: string): boolean {
  return getArchetypePublicAssetUrls(archetype) != null;
}

/** Archetypes that have public asset folders (all 12 per audit). */
export const ARCHETYPES_WITH_PUBLIC_ASSETS = LIGS_ARCHETYPES.filter(hasArchetypePublicAssets);

/**
 * File prefix override for archetypes where on-disk filenames differ.
 * E.g. Fluxionis folder uses fluxonis-prime*.png (asset typo).
 */
const FILE_PREFIX_OVERRIDE: Record<string, string> = {
  Fluxionis: "fluxonis",
};

/**
 * Get all prime image URLs for an archetype (archetype family).
 * Used when arc images unavailable. Returns empty array if not configured.
 */
export function getArchetypePrimeFamilyUrls(archetype: string): string[] {
  const entry = ARCHETYPE_FOLDER_MAP[archetype];
  const available = AVAILABLE_PRIMES_BY_ARCHETYPE[archetype];
  if (!entry || !available?.length) return [];

  const prefix = FILE_PREFIX_OVERRIDE[archetype] ?? entry.folder.replace(/-images$/, "");
  return available
    .slice()
    .sort((a, b) => a - b)
    .map((prime) => buildPublicUrl(entry.folder, `${prefix}-prime${prime}.png`));
}

/** Arc images: 12 per archetype in "{archetype} arc images/". Aequilibris → aequilibrius (asset typo). */
const ARC_IMAGE_FOLDER_MAP: Record<string, { folder: string; filePrefix: string }> = {
  Aequilibris: { folder: "aequilibrius arc images", filePrefix: "aequilibrius" },
  Duplicaris: { folder: "duplicaris arc images", filePrefix: "duplicaris" },
  Fluxionis: { folder: "fluxionis arc images", filePrefix: "fluxionis" },
  Ignispectrum: { folder: "ignispectrum arc images", filePrefix: "ignispectrum" },
  Innovaris: { folder: "innovaris arc images", filePrefix: "innovaris" },
  Obscurion: { folder: "obscurion arc images", filePrefix: "obscurion" },
  Precisura: { folder: "precisura arc images", filePrefix: "precisura" },
  Radiantis: { folder: "radiantis arc images", filePrefix: "radiantis" },
  Stabiliora: { folder: "stabiliora arc images", filePrefix: "stabiliora" },
  Structoris: { folder: "structoris arc images", filePrefix: "structoris" },
  Tenebris: { folder: "tenebris arc images", filePrefix: "tenebris" },
  Vectoris: { folder: "vectoris arc images", filePrefix: "vectoris" },
};

/** Ignispectrum asset typo: first file is Ignispectrum1.jpeg (capital I). Fluxionis: fluxonis1.jpeg (typo). */
function getArcFileName(archetype: string, index: number): string {
  if (archetype === "Ignispectrum" && index === 1) return "Ignispectrum1.jpeg";
  if (archetype === "Fluxionis" && index === 1) return "fluxonis1.jpeg";
  const entry = ARC_IMAGE_FOLDER_MAP[archetype];
  if (!entry) return "";
  return `${entry.filePrefix}${index}.jpeg`;
}

/**
 * Get all 12 arc image URLs for an archetype family (preview cycle).
 * Returns empty array if archetype has no arc folder.
 */
export function getArchetypeArcFamilyUrls(archetype: string): string[] {
  const entry = ARC_IMAGE_FOLDER_MAP[archetype];
  if (!entry) return [];
  const urls: string[] = [];
  for (let i = 1; i <= 12; i++) {
    urls.push(buildPublicUrl(entry.folder, getArcFileName(archetype, i)));
  }
  return urls;
}

/**
 * Get archetype family URLs for preview cycle. Prefers 12 arc images; falls back to prime images.
 */
export function getArchetypeFamilyUrlsForPreview(archetype: string): string[] {
  const arc = getArchetypeArcFamilyUrls(archetype);
  if (arc.length > 0) return arc;
  return getArchetypePrimeFamilyUrls(archetype);
}

/**
 * Pick one image from archetype family deterministically. Uses same pool as preview cycle (arc or prime).
 * Same reportId + archetype → same image.
 */
export function pickArchetypeFamilyImage(
  archetype: string,
  reportId: string
): string | null {
  const urls = getArchetypeFamilyUrlsForPreview(archetype);
  if (urls.length === 0) return null;
  const seed = `${reportId ?? ""}:${archetype}:family:v1`;
  const idx = hashSeed(seed) % urls.length;
  return urls[idx] ?? null;
}
