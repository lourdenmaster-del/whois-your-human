import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { ARCHETYPE_VISUAL_MAP } from "@/src/ligs/image/archetype-visual-map";

const NEGATIVE = "text, letters, logo, watermark, signature, face, person, figure, astrology, zodiac, symbols, corporate mark, brand stamp, busy texture, high contrast";

export interface MarketingImagePrompts {
  logoMark: { positive: string; negative: string };
  marketingBackground: { positive: string; negative: string };
}

/**
 * Builds deterministic prompts for marketing assets.
 * - logoMark: abstract, premium symbol (no text); scalable archetype mark, not corporate.
 * - marketingBackground: subtle, premium, archetype-aligned header background.
 * contrastDelta slightly increases clarity/energy vs base style (0–1).
 */
export function buildMarketingImagePrompts(
  archetype: LigsArchetype,
  options?: { contrastDelta?: number }
): MarketingImagePrompts {
  const visual = ARCHETYPE_VISUAL_MAP[archetype];
  const delta = Math.max(0, Math.min(1, options?.contrastDelta ?? 0.15));
  const clarity = delta > 0.3 ? "slightly increased clarity" : "";
  const energy = delta > 0.5 ? "subtle energy boost" : "";

  const sharedMood = [visual.mood, clarity, energy].filter(Boolean).join(", ");
  const sharedPalette = visual.palette.join(", ");
  const sharedMaterials = visual.materials.join(", ");

  const logoMarkPositive = [
    "Abstract premium symbol",
    "single focal element",
    "no text, no letters",
    "scalable, minimalist mark",
    "archetype-inspired",
    sharedMood,
    sharedPalette,
    sharedMaterials,
    visual.lighting,
    "generous negative space",
    "suitable for small and large display",
  ]
    .filter(Boolean)
    .join(". ");

  const bgPositive = [
    "Abstract premium background",
    "subtle, soft",
    "header or hero use",
    sharedMood,
    sharedPalette,
    sharedMaterials,
    visual.lighting,
    `${visual.negative_space === "high" ? "generous" : "moderate"} negative space`,
    visual.focal_behavior,
    "no text, no figures",
  ]
    .filter(Boolean)
    .join(". ");

  return {
    logoMark: { positive: logoMarkPositive, negative: NEGATIVE },
    marketingBackground: { positive: bgPositive, negative: NEGATIVE },
  };
}
