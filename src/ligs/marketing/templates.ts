/**
 * Square Marketing Card v1 - first vertical slice.
 * ONE template: square_card_v1 for aspectRatio 1:1.
 * All placements STATIC; deterministic.
 *
 * square_identity_v1: scientific identity share card (top-left header, bottom-left
 * identity block, bottom-right system mark). NO marketing copy, NO CTA.
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

/** Placement for square_identity_v1 — scientific identity share card. */
export interface IdentityTemplatePlacement {
  headerBlock: { x: number; y: number; w: number; h: number }; // top-left
  identityBlock: { x: number; y: number; w: number; h: number }; // bottom-left
  systemMarkBlock: { x: number; y: number; w: number; h: number }; // bottom-right
}

const SQUARE_CARD_V1: TemplatePlacement = {
  safeArea: { x: 0.08, y: 0.08, w: 0.84, h: 0.84 },
  logo: { anchor: "br", paddingPct: 0.05, maxWidthPct: 0.18 },
  textBlock: {
    box: { x: 0.12, y: 0.1, w: 0.76, h: 0.28 },
    align: "center",
  },
  ctaChip: {
    box: { x: 0.32, y: 0.78, w: 0.36, h: 0.1 },
    align: "center",
  },
};

/** square_identity_v1: top-left header, bottom-left identity block, bottom-right system mark. */
const SQUARE_IDENTITY_V1: IdentityTemplatePlacement = {
  headerBlock: { x: 0.06, y: 0.06, w: 0.45, h: 0.18 },
  identityBlock: { x: 0.06, y: 0.70, w: 0.5, h: 0.22 },
  systemMarkBlock: { x: 0.72, y: 0.92, w: 0.22, h: 0.06 },
};

const TEMPLATES: Record<string, Record<string, TemplatePlacement>> = {
  square_card_v1: {
    "1:1": SQUARE_CARD_V1,
  },
};

const IDENTITY_TEMPLATES: Record<string, IdentityTemplatePlacement> = {
  square_identity_v1: SQUARE_IDENTITY_V1,
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

/** Get identity template placement for square_identity_v1. */
export function getIdentityTemplate(
  templateId: "square_identity_v1"
): IdentityTemplatePlacement {
  return IDENTITY_TEMPLATES[templateId] ?? SQUARE_IDENTITY_V1;
}
