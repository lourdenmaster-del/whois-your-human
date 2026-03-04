/**
 * Ignis landing image resolution.
 * exemplar_card.png is the composed placeholder; we use marketing_background (raw DALL·E art) or share_card instead.
 */

/** URL is invalid for Ignis landing: static placeholder or exemplar_card composed look. */
export function isInvalidIgnisUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return true;
  if (url.includes("/exemplars/ignispectrum.png")) return true;
  if (url.endsWith("/exemplar_card.png")) return true;
  return false;
}

/** Priority: marketingBackground > shareCard. Never use exemplarCard (placeholder look). */
export function getIgnisLandingUrl(
  urls: Record<string, unknown> | null | undefined,
  envOverride?: string | null
): string | null {
  const u = urls ?? {};
  const marketingBg = (u.marketingBackground ?? u.marketing_background) as string | undefined;
  const share = (u.shareCard ?? u.share_card) as string | undefined;

  const candidates = [marketingBg, share].filter((x): x is string => typeof x === "string" && x.length > 0);
  for (const c of candidates) {
    if (!isInvalidIgnisUrl(c)) return c;
  }
  return envOverride && !isInvalidIgnisUrl(envOverride) ? envOverride : null;
}
