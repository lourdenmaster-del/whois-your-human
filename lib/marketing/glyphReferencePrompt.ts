/**
 * Glyph-reference logo mark prompt for archetype emblem generation.
 * Used when reference image (glyph SVG) is provided to DALL·E edits flow.
 * Includes Base bullet, Signature bullet (lightSignatureOverlay), STRICT GEOMETRY block,
 * and the reference-glyph directive.
 */

import { buildTriangulatedMarketingPrompt } from "./visuals";
import { getMarketingVisuals } from "@/src/ligs/archetypes/adapters";

/** Build full assembled prompt for marketing_logo_mark with glyph reference (Ignispectrum). */
export function buildGlyphReferenceLogoMarkPrompt(archetype: string): string {
  const identity = {
    primaryArchetype: archetype as "Ignispectrum",
    secondaryArchetype: "Vectoris" as const,
    seed: `exemplar-${archetype}-glyph`,
    twilightPhase: "day" as const,
  };
  const { positive: triangulatedPositive } = buildTriangulatedMarketingPrompt(
    identity,
    "marketing_logo_mark"
  );

  const style = getMarketingVisuals(archetype);

  const baseBullet =
    "• Base: Vector Zero glyph geometry, invariant containment silhouette, minimal scientific notation";
  const signatureBullet =
    "• Signature (lightSignatureOverlay): Subtle archetype-driven energy field, warm-fiery spectrum for Ignispectrum, light radial gradient overlay.";
  const strictGeometryBlock = [
    "STRICT GEOMETRY:",
    "— Match the reference glyph silhouette exactly.",
    "— Preserve topology and proportions 1:1.",
    "— Apply archetype palette and material only to the field/surface; do not alter the glyph shape.",
  ].join("\n");
  const referenceDirective =
    "Use the provided reference glyph image as the exact blueprint; match geometry 1:1.";

  const parts = [
    triangulatedPositive,
    "",
    baseBullet,
    signatureBullet,
    "",
    strictGeometryBlock,
    "",
    referenceDirective,
  ];

  return parts.join("\n").trim();
}
