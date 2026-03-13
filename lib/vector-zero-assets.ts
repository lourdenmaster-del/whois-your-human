/**
 * Vector Zero image mapping for WHOIS report and addendum.
 * Assets live at public/arc-v0-images/ (one image per archetype).
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
 * Archetype → filename in arc-v0-images. Uses existing disk filenames where they differ (e.g. aequilibrius).
 */
const ARCHETYPE_TO_V0_FILENAME: Record<string, string> = {
  Aequilibris: "aequilibrius-v01.png",
  Duplicaris: "duplicaris-v01.png",
  Fluxionis: "fluxionis-v01.png",
  Ignispectrum: "ignispectrum-v02.png",
  Innovaris: "innovaris-v01.png",
  Obscurion: "obscurion-v01.png",
  Precisura: "precisura-v01.png",
  Radiantis: "radiantis-v01.png",
  Stabiliora: "stabiliora-v01.png",
  Structoris: "structoris-v01.png",
  Tenebris: "tenebris-v01.png",
  Vectoris: "vectoris-v01.png",
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
 * Returns the public path for an archetype's Vector Zero image, or null if not mapped.
 * Example: /arc-v0-images/ignispectrum-v02.png
 */
export function getVectorZeroImagePath(archetype: string): string | null {
  const key = normalizeArchetype(archetype);
  if (!key) return null;
  const filename = ARCHETYPE_TO_V0_FILENAME[key];
  if (!filename) return null;
  return `${VECTOR_ZERO_BASE}/${filename}`;
}

/**
 * Returns the absolute URL for an archetype's Vector Zero image, or null if not mapped.
 */
export function getVectorZeroImageUrl(archetype: string, siteUrl: string): string | null {
  const path = getVectorZeroImagePath(archetype);
  if (!path) return null;
  const base = (siteUrl || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
