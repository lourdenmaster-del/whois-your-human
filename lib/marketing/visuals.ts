/**
 * Marketing visuals prompt builders.
 * Used by POST /api/marketing/visuals via image/generate with purpose marketing_logo_mark | marketing_background.
 * Triangulation modes (marketing_background, marketing_overlay, share_card) use buildTriangulatedImagePrompt.
 */

import { getMarketingVisuals } from "@/src/ligs/archetypes/adapters";
import {
  buildTriangulatedImagePrompt,
  resolveSecondaryArchetype,
  NEGATIVE_EXCLUSIONS,
} from "@/src/ligs/image/triangulatePrompt";
import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";

export interface ArchetypeStyle {
  keywords: string[];
  palette: string[];
  motion: string;
}

export type TriangulateMarketingMode = "marketing_logo_mark" | "marketing_background" | "marketing_overlay" | "share_card";

export interface MarketingIdentity {
  primaryArchetype: LigsArchetype;
  secondaryArchetype?: LigsArchetype | null;
  solarProfile?: { sunLonDeg: number; twilightPhase: string };
  twilightPhase?: string;
  seed?: string;
}

const MARKETING_NEGATIVE_LOGO =
  "text, letters, numbers, logo, watermark, signature, face, person, figure, silhouette, astrology, zodiac, symbols, corporate mark, brand stamp, shield, badge, monogram, hexagon, recognizable icon, busy texture, high contrast";

function getArchetypeStyle(archetype: string): ArchetypeStyle {
  return getMarketingVisuals(archetype);
}

/**
 * Logo mark prompt: minimal, premium, abstract energy signature.
 * NO TEXT, no astrology, no corporate geometry.
 */
export function buildLogoMarkPrompt(archetype: string, contrastDelta: number): string {
  const style = getArchetypeStyle(archetype);
  const delta = Math.max(0, Math.min(1, contrastDelta));
  const clarity = delta > 0.3 ? "slightly increased clarity" : "";
  const energy = delta > 0.5 ? "subtle energy signature" : "";

  const parts = [
    "Abstract premium symbol",
    "single focal element",
    "NO TEXT, no letters, no numbers",
    "scalable minimalist mark",
    "energy signature feel",
    style.keywords.join(", "),
    style.palette.join(", "),
    style.motion,
    "centered, strong silhouette",
    "simple gradients allowed",
    "favicon-like, works at small sizes",
    "transparent or solid neutral background",
    clarity,
    energy,
  ].filter(Boolean);

  return parts.join(". ").trim();
}

/**
 * Triangulated marketing prompt: uses buildTriangulatedImagePrompt for marketing_background,
 * marketing_overlay, share_card. Same NEGATIVE_EXCLUSIONS as triangulation.
 */
export function buildTriangulatedMarketingPrompt(
  identity: MarketingIdentity,
  mode: TriangulateMarketingMode
): { positive: string; negative: string } {
  const primary = identity.primaryArchetype;
  const secondary = identity.secondaryArchetype ?? primary;
  const secondaryResolved = resolveSecondaryArchetype(secondary, primary);
  const idx = LIGS_ARCHETYPES.indexOf(primary);
  const sunLonDeg = identity.solarProfile?.sunLonDeg ?? (idx >= 0 ? idx * 30 + 15 : 0);
  const defaultTwilight = (mode === "marketing_background" || mode === "share_card") ? "day" : "nautical";
  const phase = identity.solarProfile?.twilightPhase ?? identity.twilightPhase ?? defaultTwilight;
  const twilightPhase = ["day", "civil", "nautical", "astronomical", "night"].includes(phase)
    ? (phase as "day" | "civil" | "nautical" | "astronomical" | "night")
    : "nautical";

  return buildTriangulatedImagePrompt({
    primaryArchetype: primary,
    secondaryArchetype: secondaryResolved,
    solarProfile: { sunLonDeg, twilightPhase },
    twilightPhase,
    mode,
    seed: identity.seed,
    entropy:
      mode === "marketing_logo_mark" ? 0.2 * 0.5 :
      mode === "marketing_background" ? 0.2 * 0.6 : 0.2 * 0.8,
  });
}

/** Negative prompt for marketing visuals. Triangulation modes use NEGATIVE_EXCLUSIONS. */
export function getMarketingVisualsNegative(): string {
  return MARKETING_NEGATIVE_LOGO;
}

/** Negative exclusions used for triangulation (marketing_background, share_card, etc.). Same as triangulatePrompt. */
export function getTriangulatedMarketingNegative(): string {
  return NEGATIVE_EXCLUSIONS.join(", ");
}
