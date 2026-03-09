/**
 * Identity overlay spec for scientific identity share cards.
 * Used by Beauty share card compose flow — NOT marketing.
 * Separate from MarketingOverlaySpec; no headline/subhead/CTA.
 */

export const IDENTITY_TEMPLATE_ID = "square_identity_v1" as const;
export type IdentityTemplateId = typeof IDENTITY_TEMPLATE_ID;

export interface IdentityOverlaySpec {
  templateId: IdentityTemplateId;
  subjectName: string;
  archetypeName: string;
  lirId: string;
  generatedAt: string; // ISO UTC timestamp
  /** Optional system phrase above identity block, e.g. "Human identity vector resolved." */
  systemPhrase?: string;
  /** Archetype for optional mark in header. When set, small static image used if available. */
  markArchetype?: string;
  /** Output size. Default 1200. */
  size?: number;
}

/** Deterministic LIR-ID from reportId. Format: XXX-XX-XX */
export function generateLirId(reportId: string): string {
  let h = 0;
  for (let i = 0; i < reportId.length; i++) {
    h = ((h << 5) - h + reportId.charCodeAt(i)) | 0;
  }
  const s = Math.abs(h).toString(36).toUpperCase().padStart(8, "0").slice(-8);
  return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6, 8)}`;
}

const SYSTEM_PHRASES = [
  "Human identity vector resolved.",
  "Light-field classification stabilized.",
];

function pickSystemPhrase(reportId: string): string {
  let h = 0;
  for (let i = 0; i < reportId.length; i++) {
    h = ((h << 5) - h + reportId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % SYSTEM_PHRASES.length;
  return SYSTEM_PHRASES[idx] ?? SYSTEM_PHRASES[0];
}

export interface BuildIdentityOverlaySpecInput {
  subjectName: string;
  archetypeName: string;
  reportId: string;
  /** ISO UTC timestamp. If omitted, uses current time. */
  generatedAt?: string;
  systemPhrase?: string;
  markArchetype?: string;
}

export function buildIdentityOverlaySpec(input: BuildIdentityOverlaySpecInput): IdentityOverlaySpec {
  const {
    subjectName,
    archetypeName,
    reportId,
    generatedAt = new Date().toISOString(),
    systemPhrase,
    markArchetype = archetypeName,
  } = input;

  return {
    templateId: IDENTITY_TEMPLATE_ID,
    subjectName: String(subjectName || "Subject").trim().slice(0, 80),
    archetypeName: String(archetypeName || "Unknown").trim().slice(0, 40),
    lirId: generateLirId(reportId),
    generatedAt,
    systemPhrase: systemPhrase ?? pickSystemPhrase(reportId),
    markArchetype: markArchetype?.trim() || undefined,
    size: 1200,
  };
}
