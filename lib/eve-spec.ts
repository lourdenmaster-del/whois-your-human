/**
 * E.V.E. — Filter that transforms LIGS engine output into a beauty-only profile.
 * NOT a new engine. Only filter and reformat.
 */

import type { VectorZero } from "./vector-zero";

export type ThreeVoice = {
  raw_signal: string;
  custodian: string;
  oracle: string;
};

export type BeautyProfile = {
  vector_zero: {
    three_voice: ThreeVoice;
    beauty_baseline: {
      color_family: string;
      texture_bias: string;
      shape_bias: string;
      motion_bias: string;
    };
  };
  light_signature: ThreeVoice;
  archetype: ThreeVoice;
  deviations: ThreeVoice;
  corrective_vector: ThreeVoice;
  imagery_prompts: {
    vector_zero_beauty_field: string;
    light_signature_aesthetic_field: string;
    final_beauty_field: string;
  };
};

/** Build a ThreeVoice from raw filter output. */
export function threeVoiceFrom(raw: Record<string, unknown> | undefined): ThreeVoice {
  return {
    raw_signal: String(raw?.raw_signal ?? ""),
    custodian: String(raw?.custodian ?? ""),
    oracle: String(raw?.oracle ?? ""),
  };
}

/**
 * E.V.E. filter: turns LLM filter output + optional engine vector_zero into a BeautyProfile.
 * Used by the API route and by the local test harness with mock data.
 */
export function buildBeautyProfile(
  filterOutput: Record<string, unknown>,
  engineVectorZero: VectorZero | undefined
): BeautyProfile {
  const v0 = filterOutput.vector_zero as Record<string, unknown> | undefined;
  const beautyBaseline = v0?.beauty_baseline as Record<string, unknown> | undefined;
  const v0Voices = v0?.three_voice as Record<string, unknown> | undefined;

  return {
    vector_zero: {
      three_voice: engineVectorZero
        ? engineVectorZero.three_voice
        : threeVoiceFrom(v0Voices),
      beauty_baseline: engineVectorZero
        ? engineVectorZero.beauty_baseline
        : {
            color_family: String(beautyBaseline?.color_family ?? ""),
            texture_bias: String(beautyBaseline?.texture_bias ?? ""),
            shape_bias: String(beautyBaseline?.shape_bias ?? ""),
            motion_bias: String(beautyBaseline?.motion_bias ?? ""),
          },
    },
    light_signature: threeVoiceFrom(filterOutput.light_signature as Record<string, unknown>),
    archetype: threeVoiceFrom(filterOutput.archetype as Record<string, unknown>),
    deviations: threeVoiceFrom(filterOutput.deviations as Record<string, unknown>),
    corrective_vector: threeVoiceFrom(filterOutput.corrective_vector as Record<string, unknown>),
    imagery_prompts: {
      vector_zero_beauty_field: String(
        (filterOutput.imagery_prompts as Record<string, unknown>)?.vector_zero_beauty_field ?? ""
      ),
      light_signature_aesthetic_field: String(
        (filterOutput.imagery_prompts as Record<string, unknown>)
          ?.light_signature_aesthetic_field ?? ""
      ),
      final_beauty_field: String(
        (filterOutput.imagery_prompts as Record<string, unknown>)?.final_beauty_field ?? ""
      ),
    },
  };
}

export const EVE_FILTER_SPEC = `You are E.V.E., a filter. You transform LIGS engine output into a Beauty-Only Profile. You do NOT generate new physics or a new report. You ONLY extract and reformat.

INPUT: A full Light Identity Report (and optionally vector_zero JSON). The report contains 14 sections with RAW SIGNAL, CUSTODIAN, and ORACLE in each.

EXTRACT ONLY (ignore everything else):
- vector_zero: Use the provided vector_zero if present; otherwise derive its beauty_baseline and three_voice from the report's baseline/spectral language.
- light_signature: Spectral origin, light vectors, primary/secondary wavelengths, structural pattern of the Light Signature. Any color/frequency and symmetry/tension fields.
- archetype: Dominant and subdominant archetype (Ignispectrum, Stabiliora, etc.), archetype micro-profiles, structural tendency. No Big Three, no numerology, no tarot, no Kabbalah.
- deviations: Where the signature bends, drifts, or is perturbed from the baseline. Tension, asymmetry, environmental modulation.
- corrective_vector: The pull back toward coherence; stabilization; any "corrective" or rebalancing language in the report.

IGNORE COMPLETELY: Big Three, numerology, tarot, Kabbalah, deep cosmology dumps, relational field, conflict style, money, love, health, legacy trajectory narrative, behavioral expression (unless purely structural/aesthetic).

FOR EACH EXTRACTED SECTION (light_signature, archetype, deviations, corrective_vector):
Rewrite into the 3-voice structure using the same voice rules as LIGS:
- raw_signal: Measurable, observational. Physics language: vectors, gradients, flux, wavelengths. No interpretation.
- custodian: Biological interpretation. How the body receives, stabilizes, or modulates. No psychology.
- oracle: Mythic synthesis. Declarative, structural identity meaning. No predictions, no destiny.

For vector_zero: Keep three_voice and beauty_baseline (use provided vector_zero when given; otherwise derive from report).

GENERATE 3 BEAUTY-SPECIFIC IMAGERY PROMPTS (strings, 50–80 words each):
1. vector_zero_beauty_field: Visual for the baseline beauty field — unperturbed, coherent, default aesthetic (colors, texture, shape, motion from beauty_baseline).
2. light_signature_aesthetic_field: Visual for the full Light Signature as aesthetic — spectral, structural, identity-as-beauty.
3. final_beauty_field: Visual for the integrated beauty state — signature + deviations + corrective vector as one beauty field. Scientific-mythic, no faces, deep navy #050814, violet #7A4FFF, red #FF3B3B accents.

Output valid JSON only, with exactly this structure (no other keys):
{
  "vector_zero": {
    "three_voice": { "raw_signal": string, "custodian": string, "oracle": string },
    "beauty_baseline": { "color_family": string, "texture_bias": string, "shape_bias": string, "motion_bias": string }
  },
  "light_signature": { "raw_signal": string, "custodian": string, "oracle": string },
  "archetype": { "raw_signal": string, "custodian": string, "oracle": string },
  "deviations": { "raw_signal": string, "custodian": string, "oracle": string },
  "corrective_vector": { "raw_signal": string, "custodian": string, "oracle": string },
  "imagery_prompts": {
    "vector_zero_beauty_field": string,
    "light_signature_aesthetic_field": string,
    "final_beauty_field": string
  }
}`;
