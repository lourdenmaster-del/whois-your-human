/**
 * Build a minimal VoiceProfile for deterministic marketing card generation.
 * Used when no full VoiceProfile exists (e.g. engine route, TEST_MODE).
 * Imagery source of truth: engine output (primaryArchetype, secondaryArchetype) takes precedence.
 * This fallback is used only when engine output is missing.
 */

import type { VoiceProfile } from "@/src/ligs/voice/schema";
import { FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";

/** Canonical LIGS archetypes for type safety. */
const VALID_ARCHETYPES = [
  "Ignispectrum",
  "Stabiliora",
  "Duplicaris",
  "Tenebris",
  "Radiantis",
  "Precisura",
  "Aequilibris",
  "Obscurion",
  "Vectoris",
  "Structoris",
  "Innovaris",
  "Fluxionis",
] as const;

function isValidArchetype(s: string): s is (typeof VALID_ARCHETYPES)[number] {
  return (VALID_ARCHETYPES as readonly string[]).includes(s);
}

/**
 * Returns a minimal VoiceProfile sufficient for buildOverlaySpecWithCopy.
 * Uses archetype for copy, formatting, and constraints.
 * @param options.deterministicId - When provided (e.g. reportId), uses for profile.id for cache stability.
 */
export function buildMinimalVoiceProfile(
  archetypeName: string,
  options?: { deterministicId?: string }
): VoiceProfile {
  const arch = isValidArchetype(archetypeName) ? archetypeName : FALLBACK_PRIMARY_ARCHETYPE;
  const id = options?.deterministicId ?? `minimal_${arch}_${Date.now()}`;
  return {
    id,
    version: "1.0.0",
    created_at: new Date().toISOString(),
    owner_user_id: "beauty_engine",
    brand: {
      name: "LIGS",
      products: [],
      audience: "",
    },
    ligs: {
      primary_archetype: arch,
      secondary_archetype: null,
      blend_weights: {},
    },
    descriptors: [arch, "archetypal", "distinct"],
    cadence: {
      sentence_length: { target_words: 12, range: [6, 24] },
      paragraph_length: { target_sentences: 3, range: [2, 6] },
      rhythm_notes: "",
    },
    lexicon: {
      preferred_words: [],
      avoid_words: [],
      banned_words: [],
    },
    formatting: {
      emoji_policy: "none",
      exclamation_policy: "rare",
      capitalization: "standard",
      bullets: "allowed",
      headline_style: "clean minimal",
    },
    claims_policy: {
      medical_claims: "prohibited",
      before_after_promises: "prohibited",
      substantiation_required: true,
      allowed_phrasing: [],
    },
    channel_adapters: {},
    examples: { do: [], dont: [] },
  };
}
