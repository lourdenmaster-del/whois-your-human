import type { LigsArchetype } from "@/src/ligs/voice/schema";

/** CTA tone: soft = gentle invitation, direct = clear action, premium = understated luxury */
export type CTAStyle = "soft" | "direct" | "premium" | "subtle";

/** Marketing descriptor driving UI: copy, CTA, optional visuals. */
export interface MarketingDescriptor {
  archetypeLabel: string;
  tagline: string;
  hitPoints: string[];
  ctaText: string;
  ctaStyle: CTAStyle;
  /** Slight clarity/energy boost vs base style (0–1). Higher = more contrast for marketing surface. */
  contrastDelta: number;
}

/** Optional URL or base64 image assets. UI degrades gracefully when missing. */
export interface MarketingAssets {
  logoMark?: { url?: string; b64?: string };
  marketingBackground?: { url?: string; b64?: string };
}

/** Full response from marketing/generate. */
export interface MarketingGenerateResponse {
  descriptor: MarketingDescriptor;
  assets: MarketingAssets;
  requestId?: string;
  dryRun?: boolean;
}
