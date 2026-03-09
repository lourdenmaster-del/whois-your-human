/**
 * Archetype → public asset URL mapping.
 * Folders: public/{archetype}-images/
 * Files: {archetype}-prime1.png, {archetype}-prime2.png, {archetype}-prime3.png
 * Contract: prime1=marketingBackground, prime2=exemplarCard, prime3=shareCard.
 */

import { LIGS_ARCHETYPES } from "@/lib/archetypes";

export interface ArchetypePublicAssetUrls {
  marketingBackground: string;
  exemplarCard: string;
  shareCard: string;
}

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
