/**
 * Vector Zero image mapping for WHOIS report and addendum.
 * Assets live at public/arc-v0-images/. Each archetype has 4 variants (v01–v04).
 * Variant is chosen by rotation index: 0→v01, 1→v02, 2→v03, 3→v04, 4→v01, …
 * Use a monotonic value (e.g. registry count) so the system rotates through all 4 variants.
 */

const VECTOR_ZERO_BASE = "/arc-v0-images";

/** Canonical archetype keys (match email-waitlist-confirmation and archetype contract). */
const ARCHETYPE_KEYS: Record<string, true> = {
  Aequilibris: true,
  Duplicaris: true,
  Fluxionis: true,
  Ignispectrum: true,
  Innovaris: true,
  Obscurion: true,
  Precisura: true,
  Radiantis: true,
  Stabiliora: true,
  Structoris: true,
  Tenebris: true,
  Vectoris: true,
};

/**
 * Archetype → array of filenames in arc-v0-images. Naming: <archetype>-v01.png … v04.png (lowercase).
 * Aequilibris uses disk spelling "aequilibrius" for compatibility.
 */
const ARCHETYPE_TO_V0_FILENAMES: Record<string, readonly string[]> = {
  Aequilibris: ["aequilibrius-v01.png", "aequilibrius-v02.png", "aequilibrius-v03.png", "aequilibrius-v04.png"],
  Duplicaris: ["duplicaris-v01.png", "duplicaris-v02.png", "duplicaris-v03.png", "duplicaris-v04.png"],
  Fluxionis: ["fluxionis-v01.png", "fluxionis-v02.png", "fluxionis-v03.png", "fluxionis-v04.png"],
  Ignispectrum: ["ignispectrum-v01.png", "ignispectrum-v02.png", "ignispectrum-v03.png", "ignispectrum-v04.png"],
  Innovaris: ["innovaris-v01.png", "innovaris-v02.png", "innovaris-v03.png", "innovaris-v04.png"],
  Obscurion: ["obscurion-v01.png", "obscurion-v02.png", "obscurion-v03.png", "obscurion-v04.png"],
  Precisura: ["precisura-v01.png", "precisura-v02.png", "precisura-v03.png", "precisura-v04.png"],
  Radiantis: ["radiantis-v01.png", "radiantis-v02.png", "radiantis-v03.png", "radiantis-v04.png"],
  Stabiliora: ["stabiliora-v01.png", "stabiliora-v02.png", "stabiliora-v03.png", "stabiliora-v04.png"],
  Structoris: ["structoris-v01.png", "structoris-v02.png", "structoris-v03.png", "structoris-v04.png"],
  Tenebris: ["tenebris-v01.png", "tenebris-v02.png", "tenebris-v03.png", "tenebris-v04.png"],
  Vectoris: ["vectoris-v01.png", "vectoris-v02.png", "vectoris-v03.png", "vectoris-v04.png"],
};

function normalizeArchetype(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (ARCHETYPE_KEYS[trimmed as keyof typeof ARCHETYPE_KEYS]) return trimmed;
  const lower = trimmed.toLowerCase();
  const found = Object.keys(ARCHETYPE_KEYS).find((k) => k.toLowerCase() === lower);
  return found ?? null;
}

/**
 * Deterministic 32-bit-style hash of a string. Used only when no monotonic rotation index is available.
 */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Resolve a rotation index (0-based) from either a numeric index or a seed string.
 * Prefer number (e.g. registry count % 4) so variants rotate across records.
 */
function toRotationIndex(rotationIndexOrSeed: number | string, variantCount: number): number {
  if (typeof rotationIndexOrSeed === "number" && Number.isFinite(rotationIndexOrSeed)) {
    return Math.floor(Math.abs(rotationIndexOrSeed)) % variantCount;
  }
  if (typeof rotationIndexOrSeed === "string" && rotationIndexOrSeed.length > 0) {
    return hashString(rotationIndexOrSeed) % variantCount;
  }
  return 0;
}

/**
 * Select one Vector Zero filename for the archetype by rotation index.
 * rotationIndexOrSeed: 0-based monotonic value (e.g. registry count % 4), or seed string for fallback.
 * Rotation: 0→v01, 1→v02, 2→v03, 3→v04, 4→v01, …
 */
export function selectVectorZeroFilename(
  archetype: string,
  rotationIndexOrSeed: number | string
): string | null {
  const key = normalizeArchetype(archetype);
  if (!key) return null;
  const filenames = ARCHETYPE_TO_V0_FILENAMES[key];
  if (!filenames || filenames.length === 0) return null;
  const index = toRotationIndex(rotationIndexOrSeed, filenames.length);
  return filenames[index];
}

/**
 * Returns the public path for the selected Vector Zero image, or null if not mapped.
 */
export function getVectorZeroImagePath(
  archetype: string,
  rotationIndexOrSeed: number | string
): string | null {
  const filename = selectVectorZeroFilename(archetype, rotationIndexOrSeed);
  if (!filename) return null;
  return `${VECTOR_ZERO_BASE}/${filename}`;
}

/**
 * Returns the absolute URL for the selected Vector Zero image, or null if not mapped.
 */
export function getVectorZeroImageUrl(
  archetype: string,
  siteUrl: string,
  rotationIndexOrSeed: number | string
): string | null {
  const path = getVectorZeroImagePath(archetype, rotationIndexOrSeed);
  if (!path) return null;
  const base = (siteUrl || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
