/**
 * Square Marketing Card v1 - first vertical slice.
 * ONE template: square_card_v1 for aspectRatio 1:1.
 * All placements STATIC; deterministic.
 */

export type TemplateId = "square_card_v1";
export type AspectRatio = "1:1";

export interface TemplatePlacement {
  safeArea: { x: number; y: number; w: number; h: number };
  logo: { anchor: "br"; paddingPct: number; maxWidthPct: number };
  textBlock: {
    box: { x: number; y: number; w: number; h: number };
    align: "center";
  };
  ctaChip?: {
    box: { x: number; y: number; w: number; h: number };
    align: "center";
  };
}

const SQUARE_CARD_V1: TemplatePlacement = {
  safeArea: { x: 0.08, y: 0.08, w: 0.84, h: 0.84 },
  logo: { anchor: "br", paddingPct: 0.05, maxWidthPct: 0.18 },
  textBlock: {
    box: { x: 0.12, y: 0.18, w: 0.76, h: 0.52 },
    align: "center",
  },
  ctaChip: {
    box: { x: 0.32, y: 0.72, w: 0.36, h: 0.1 },
    align: "center",
  },
};

const TEMPLATES: Record<string, Record<string, TemplatePlacement>> = {
  square_card_v1: {
    "1:1": SQUARE_CARD_V1,
  },
};

/**
 * Get template placement. Returns placements for templateId + aspectRatio.
 * square_card_v1 supports 1:1 only; other aspect ratios fall back to 1:1.
 */
export function getTemplate(
  templateId: TemplateId,
  aspectRatio: AspectRatio
): TemplatePlacement {
  const byAspect = TEMPLATES[templateId];
  if (!byAspect) {
    return SQUARE_CARD_V1;
  }
  return byAspect[aspectRatio] ?? byAspect["1:1"] ?? SQUARE_CARD_V1;
}
