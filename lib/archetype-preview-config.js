/**
 * Archetype preview configuration: display names, glyph paths, sample artifact URLs.
 * Used by TerminalResolutionSequence, ArchetypeArtifactCard, PreviewCarousel.
 */

import { IGNIS_LANDING_URL } from "./exemplar-store";

export const ARCHETYPE_PREVIEW_CONFIG = {
  Ignispectrum: {
    displayName: "IGNISPECTRUM",
    glyphPath: "/glyphs/ignis.svg",
    sampleArtifactUrl: IGNIS_LANDING_URL,
  },
};

/**
 * Get preview config for an archetype. Returns displayName, glyphPath, sampleArtifactUrl,
 * hasGlyph, hasSampleArtifact. Unknown archetypes get displayName = archetype.toUpperCase(),
 * glyphPath=null, sampleArtifactUrl=null, hasGlyph=false, hasSampleArtifact=false.
 */
export function getArchetypePreviewConfig(archetype) {
  if (!archetype || typeof archetype !== "string") {
    return {
      displayName: "—",
      glyphPath: null,
      sampleArtifactUrl: null,
      hasGlyph: false,
      hasSampleArtifact: false,
    };
  }
  const key = archetype.trim();
  const config = ARCHETYPE_PREVIEW_CONFIG[key];
  if (config) {
    return {
      displayName: config.displayName,
      glyphPath: config.glyphPath ?? null,
      sampleArtifactUrl: config.sampleArtifactUrl ?? null,
      hasGlyph: Boolean(config.glyphPath),
      hasSampleArtifact: Boolean(config.sampleArtifactUrl),
    };
  }
  return {
    displayName: archetype.toUpperCase(),
    glyphPath: null,
    sampleArtifactUrl: null,
    hasGlyph: false,
    hasSampleArtifact: false,
  };
}

/**
 * Build a data URL for a dark card with archetype name when no sample artifact exists.
 */
export function buildPlaceholderSvg(displayName) {
  const name = displayName && typeof displayName === "string" ? displayName : "ARCHETYPE";
  const encoded = encodeURIComponent(name);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230d0d0f' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em' font-family='ui-monospace,sans-serif'%3E${encoded}%3C/text%3E%3C/svg%3E`;
}
