/**
 * Default overlay copy derived from marketingDescriptor.
 * Single source of truth for: headline = archetypeLabel, subhead = tagline, cta = ctaText.
 * Used by: buildOverlaySpecWithCopy, generateOverlaySpec, LigsStudio, ShareCard (via descriptor).
 */

import { getMarketingDescriptor } from "./descriptor";

/** Schema limits for overlay copy. */
const MAX_HEADLINE = 60;
const MAX_SUBHEAD = 140;
const MAX_CTA = 24;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3).trim() + "...";
}

export interface DefaultOverlayCopy {
  headline: string;
  subhead?: string;
  cta?: string;
}

/**
 * Returns overlay copy from marketingDescriptor. Canonical mapping:
 * - headline = archetypeLabel
 * - subhead = tagline
 * - cta = ctaText
 */
export function getDefaultOverlayCopy(archetype: string): DefaultOverlayCopy {
  const d = getMarketingDescriptor(archetype);
  return {
    headline: truncate(d.archetypeLabel, MAX_HEADLINE),
    subhead: d.tagline ? truncate(d.tagline, MAX_SUBHEAD) : undefined,
    cta: d.ctaText ? truncate(d.ctaText, MAX_CTA) : undefined,
  };
}
