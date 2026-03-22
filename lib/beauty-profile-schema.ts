import type { VectorZero } from "@/lib/vector-zero";
import type { BeautyProfile } from "@/lib/eve-spec";

/** Stable engine/build identifier for audit. */
export const SCHEMA_VERSION = "beautyProfileV2";

/** Registry lifecycle states. */
export type RegistryState = "REGISTERED" | "MINTED" | "INDEXED" | "RESOLVED";

/** Registry schema — optional, backward compatible. Tracks lifecycle and artifacts. */
export interface RegistryRecordSchema {
  /** Canonical ID; mirrors reportId. */
  canonical_id: string;
  /** Current lifecycle state. */
  state: RegistryState;
  /** Artifacts present on this record. */
  artifacts: {
    human_prior: boolean;
    mint_record?: boolean;
    resolution_record?: boolean;
  };
  /** Agent surface status. */
  agent_surface: {
    active: boolean;
    token_issued?: boolean;
    token_type?: string;
  };
  /** Visibility; INDEXED reserved for future use. */
  visibility?: {
    indexed?: boolean;
  };
  /** Lifecycle timestamps (ISO 8601). */
  timestamps: {
    registered_at: string;
    minted_at?: string;
    indexed_at?: string;
    resolved_at?: string;
  };
  /** Provenance: how record reached each stage. */
  provenance?: {
    created_via?: string;
    minted_via?: string;
    resolved_via?: string;
  };
}

/** Derive engineVersion from env when available. */
export function getEngineVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha && typeof sha === "string") return `ev-${sha.slice(0, 7)}`;
  return "ev-dev";
}

/**
 * Canonical Beauty Profile schema (v1) — matches the shape produced by /api/engine.
 * New saves include schemaVersion and engineVersion.
 */
export interface BeautyProfileV1 extends BeautyProfile {
  version: "1.0";
  /** New saves: "beautyProfileV2". Old reports omit. */
  schemaVersion?: string;
  /** New saves: ev-{sha} or ev-dev. Old reports omit. */
  engineVersion?: string;
  reportId: string;
  subjectName?: string;
  /** Dominant archetype name (e.g. from extractArchetypeFromReport) for ShareCard and marketing. */
  dominantArchetype?: string;
  emotionalSnippet?: string;
  imagePrompts?: string[];
  imageUrls?: string[];
  fullReport?: string;
  vectorZero?: VectorZero;
  /** Full prompts + slug used for each image (no truncation). New saves only. */
  imagePromptsUsed?: Array<{ slug: string; prompt: string }>;
  /** URL of marketing background image. Set when generated (live only). */
  marketingBackgroundUrl?: string;
  /** URL of logo mark image. Set when generated (live only). */
  logoMarkUrl?: string;
  /** URL of composed marketing card. Set when marketing card is generated (dry or live). */
  marketingCardUrl?: string;
  /** URL of share card image. Set when share card is generated (live only). */
  shareCardUrl?: string;
  /** True when keeper manifest was saved on full-cylinders success. */
  keeperReady?: boolean;
  /** URL to ligs-keepers/{reportId}.json when keeperReady. */
  keeperManifestUrl?: string;
  /** Solar profile (sunLonDeg, twilightPhase) for triangulation. */
  solarProfile?: { sunLonDeg: number; twilightPhase: string };
  /** Physics-derived seasonal light profile for glyph geometry mapping. */
  solarSeasonProfile?: {
    seasonIndex: number;
    archetype: string;
    lonCenterDeg: number;
    solarDeclinationDeg: number;
    declinationAbs: number;
    seasonalPolarity: "waxing" | "waning";
    insolationProxy01: number;
    twilightClass: string;
    dayLengthNorm01: number | null;
  };
  /** Origin identity inputs for paid WHOIS (persisted when engine receives them). */
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
  /** Origin coordinates display string when birthContext had lat/lon (e.g. "Place, 40.7128°N, 74.0060°W"). */
  originCoordinatesDisplay?: string;
  /** Registry lifecycle schema. Optional; added by canonical registry record schema pass. */
  registry?: RegistryRecordSchema;
  timings: {
    totalMs: number;
    engineMs: number;
    reportFetchMs: number;
    beautyFilterMs: number;
  };
}

function hasRequiredBeautyProfileV1(json: unknown): json is BeautyProfileV1 {
  if (json == null || typeof json !== "object") return false;
  const o = json as Record<string, unknown>;
  if (o.version !== "1.0") return false;
  if (typeof o.reportId !== "string") return false;
  const t = o.timings as Record<string, unknown> | undefined;
  if (!t || typeof t !== "object") return false;
  if (typeof t.totalMs !== "number" || typeof t.engineMs !== "number" || typeof t.reportFetchMs !== "number" || typeof t.beautyFilterMs !== "number") return false;
  const v0 = o.vector_zero as Record<string, unknown> | undefined;
  if (!v0 || typeof v0 !== "object") return false;
  const tt = v0.three_voice as Record<string, unknown> | undefined;
  const bb = v0.beauty_baseline as Record<string, unknown> | undefined;
  if (!tt || typeof tt !== "object" || !bb || typeof bb !== "object") return false;
  if (typeof (o.light_signature as Record<string, unknown>)?.raw_signal !== "string") return false;
  if (typeof (o.archetype as Record<string, unknown>)?.raw_signal !== "string") return false;
  if (typeof (o.deviations as Record<string, unknown>)?.raw_signal !== "string") return false;
  if (typeof (o.corrective_vector as Record<string, unknown>)?.raw_signal !== "string") return false;
  const ip = o.imagery_prompts as Record<string, unknown> | undefined;
  if (!ip || typeof ip !== "object") return false;
  return true;
}

/**
 * Asserts that json conforms to BeautyProfileV1. Throws if required fields are missing.
 */
export function assertBeautyProfileV1(json: unknown): asserts json is BeautyProfileV1 {
  if (!hasRequiredBeautyProfileV1(json)) {
    throw new Error("BEAUTY_PROFILE_SCHEMA_MISMATCH");
  }
}

/** Build registry schema for REGISTERED state (free registration / Human Prior). */
export function buildRegistryForRegistered(reportId: string, createdVia = "dry_run"): RegistryRecordSchema {
  const now = new Date().toISOString();
  return {
    canonical_id: reportId,
    state: "REGISTERED",
    artifacts: { human_prior: true },
    agent_surface: { active: false },
    timestamps: { registered_at: now },
    provenance: { created_via: createdVia },
  };
}

/** Build registry schema for RESOLVED state (full resolution). Merges with existing if provided. */
export function buildRegistryForResolved(
  reportId: string,
  existing?: RegistryRecordSchema | null,
  resolvedVia = "engine"
): RegistryRecordSchema {
  const now = new Date().toISOString();
  const reg = existing?.timestamps?.registered_at ?? now;
  const minted = existing?.timestamps?.minted_at;
  return {
    canonical_id: reportId,
    state: "RESOLVED",
    artifacts: {
      human_prior: true,
      mint_record: existing?.artifacts?.mint_record ?? false,
      resolution_record: true,
    },
    agent_surface: existing?.agent_surface ?? { active: false },
    visibility: existing?.visibility,
    timestamps: {
      registered_at: reg,
      ...(minted && { minted_at: minted }),
      ...(existing?.timestamps?.indexed_at && { indexed_at: existing.timestamps.indexed_at }),
      resolved_at: now,
    },
    provenance: {
      ...existing?.provenance,
      created_via: existing?.provenance?.created_via ?? "engine",
      resolved_via: resolvedVia,
    },
  };
}

/** Merge MINTED state into existing registry. Returns updated registry. */
export function mergeRegistryMinted(existing: RegistryRecordSchema): RegistryRecordSchema {
  const now = new Date().toISOString();
  return {
    ...existing,
    state: "MINTED",
    artifacts: {
      ...existing.artifacts,
      mint_record: true,
    },
    agent_surface: {
      active: true,
      token_issued: true,
      token_type: "wyh",
    },
    timestamps: {
      ...existing.timestamps,
      minted_at: now,
    },
    provenance: {
      ...existing.provenance,
      minted_via: "stripe_checkout",
    },
  };
}
