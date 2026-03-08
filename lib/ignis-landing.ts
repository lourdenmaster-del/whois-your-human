/**
 * Ignis landing image resolution.
 * Use ONLY marketing_background (raw DALL·E field). Never exemplar_card or share_card (both are
 * the same composed card: archetype image + headline/subhead/CTA + (L) logo — wrong for landing).
 * Archetype visual is rendered as overlay via public/arc-static-images/ignispectrum-static1.png.
 */

/** URL is invalid for Ignis landing: static placeholder or composed card look. */
export function isInvalidIgnisUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return true;
  if (url.includes("/exemplars/ignispectrum.png")) return true;
  if (url.endsWith("/exemplar_card.png")) return true;
  if (url.endsWith("/share_card.png")) return true;
  return false;
}

/** Ignis landing: ONLY marketingBackground (v2, then v1). Never exemplarCard or shareCard. */
export function getIgnisLandingUrl(
  urls: Record<string, unknown> | null | undefined,
  envOverride?: string | null
): string | null {
  const u = urls ?? {};
  const marketingBg = (u.marketingBackground ?? u.marketing_background) as string | undefined;
  if (typeof marketingBg === "string" && marketingBg.length > 0 && !isInvalidIgnisUrl(marketingBg)) {
    return marketingBg;
  }
  return envOverride && !isInvalidIgnisUrl(envOverride) ? envOverride : null;
}
