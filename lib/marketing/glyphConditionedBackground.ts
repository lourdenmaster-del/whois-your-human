/**
 * Glyph-conditioned background prompt for Ignis.
 * Uses style engine + composition directive for DALL·E 2 edits flow.
 */

import { buildTriangulatedMarketingPrompt } from "./visuals";

const COMPOSITION_DIRECTIVE = `COMPOSITION:
- The reference glyph is the seed: place it centered and slightly below midline.
- The Ignis field grows outward from it as coherent energy and light structure.
- Keep glyph shape intact; no additional marks or graphic elements.`;

/** Build full prompt for archetype_background_from_glyph (Ignis). Max 1000 chars for DALL·E 2. */
export function buildGlyphConditionedBackgroundPrompt(archetype: string): string {
  const identity = {
    primaryArchetype: archetype as "Ignispectrum",
    secondaryArchetype: "Vectoris" as const,
    seed: "exemplar-glyph-conditioned",
    twilightPhase: "day" as const,
  };
  const { positive } = buildTriangulatedMarketingPrompt(identity, "marketing_background");
  const combined = `${positive}\n\n${COMPOSITION_DIRECTIVE}`;
  return combined.slice(0, 1000);
}
