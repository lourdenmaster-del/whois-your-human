/**
 * Archetype → static image path mapping.
 * Uses images in public/arc-static-images/.
 * Fallback: neutral placeholder when image missing.
 *
 * NOTE: Fluxionis maps to fluxonis-static1.png (filename typo in source assets).
 */

const ARC_STATIC_DIR = "arc-static-images";

/** Filename per archetype. Fluxionis → fluxonis-static1.png (asset typo). */
const ARCHETYPE_STATIC_MAP: Record<string, string> = {
  Aequilibris: "aequilibris-static1.png",
  Duplicaris: "duplicaris-static1.png",
  Fluxionis: "fluxonis-static1.png",
  Ignispectrum: "ignispectrum-static1.png",
  Innovaris: "innovaris-static1.png",
  Obscurion: "obscurion-static1.png",
  Precisura: "precisura-static1.png",
  Radiantis: "radiantis-static1.png",
  Stabiliora: "stabiliora-static1.png",
  Structoris: "structoris-static1.png",
  Tenebris: "tenebris-static1.png",
  Vectoris: "vectoris-static1.png",
};

/** Fallback when archetype image missing. */
export const ARC_STATIC_FALLBACK = "/arc-static-images/ignispectrum-static1.png";

/**
 * Get static image path for an archetype.
 * Returns null if not configured (caller should use fallback).
 */
export function getArchetypeStaticImagePath(archetype: string): string | null {
  if (!archetype || typeof archetype !== "string") return null;
  const file = ARCHETYPE_STATIC_MAP[archetype.trim()];
  if (!file) return null;
  return `/${ARC_STATIC_DIR}/${file}`;
}

/** Check if archetype has static image configured. */
export function hasArchetypeStaticImage(archetype: string): boolean {
  return getArchetypeStaticImagePath(archetype) != null;
}

/** Resolve path with fallback. Use when you must never show a broken image. */
export function getArchetypeStaticImagePathOrFallback(archetype: string): string {
  return getArchetypeStaticImagePath(archetype) ?? ARC_STATIC_FALLBACK;
}
