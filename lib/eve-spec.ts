/**
 * E.V.E. — Filter that transforms LIGS engine output into a beauty-only profile.
 * NOT a new engine. Only filter and reformat.
 */

import type { VectorZero } from "./vector-zero";
import {
  getArchetypeOrFallback,
  LIGS_ARCHETYPES,
} from "@/src/ligs/archetypes/contract";
import {
  buildPhraseBankBlock,
  getArchetypePhraseBank,
} from "@/src/ligs/voice/archetypePhraseBank";
import type { LigsArchetype } from "@/src/ligs/voice/schema";

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

/** Extract dominant archetype name from report text (e.g., "Dominant: Radiantis"). */
export function extractArchetypeFromReport(report: string): string | undefined {
  const m = report.match(/Dominant:\s*(\w+)/i);
  if (m) {
    const name = m[1];
    if (LIGS_ARCHETYPES.includes(name as (typeof LIGS_ARCHETYPES)[number])) return name;
  }
  for (const arch of LIGS_ARCHETYPES) {
    if (report.includes(arch)) return arch;
  }
  return undefined;
}

/** Build archetype voice block for E.V.E. prompt injection. */
export function buildArchetypeVoiceBlock(archetypeName: string): string {
  const contract = getArchetypeOrFallback(archetypeName);
  const v = contract.voice;
  return `
ARCHETYPE VOICE — Align phrasing to these parameters (use archetype name max once per section):
- emotional_temperature: ${v.emotional_temperature}
- rhythm: ${v.rhythm}
- lexicon_bias: ${v.lexicon_bias.join(", ")}
- metaphor_density: ${v.metaphor_density}
- assertiveness: ${v.assertiveness}
- structure_preference: ${v.structure_preference}
- notes: ${v.notes}
`.trim();
}

/** Build archetype phrase bank block for E.V.E. (when archetype is a known LigsArchetype). */
export function buildArchetypePhraseBankBlock(archetypeName: string): string {
  if (!LIGS_ARCHETYPES.includes(archetypeName as LigsArchetype)) return "";
  return buildPhraseBankBlock(archetypeName as LigsArchetype);
}

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

/** Options for buildCondensedFullReport layout. */
export interface CondensedFullReportOptions {
  /** Archetype name for Key Moves block (e.g. from extractArchetypeFromReport). */
  archetypeName?: string;
  /** Use elegant labels (Signal/Ground/Reflection) when true; RAW SIGNAL/CUSTODIAN/ORACLE when false. */
  useElegantLabels?: boolean;
}

const SECTION_BRIDGES: Record<string, string> = {
  "Light Signature": "How you shine when you're aligned.",
  Archetype: "Your core pattern and how it presents.",
  Deviations: "Where the pattern drifts under pressure.",
  "Corrective Vector": "How you return to center.",
};

/**
 * Builds a condensed user-facing full report from the extracted Beauty profile sections.
 * Premium layout: bridge lines, elegant labels, Key Moves block.
 */
export function buildCondensedFullReport(
  profile: BeautyProfile,
  options?: CondensedFullReportOptions
): string {
  const useElegantLabels = options?.useElegantLabels !== false;
  const signalLabel = useElegantLabels ? "Signal" : "RAW SIGNAL";
  const custodianLabel = useElegantLabels ? "Ground" : "CUSTODIAN";
  const oracleLabel = useElegantLabels ? "Reflection" : "ORACLE";

  const sections: Array<{ title: string; v: ThreeVoice }> = [
    { title: "Light Signature", v: profile.light_signature },
    { title: "Archetype", v: profile.archetype },
    { title: "Deviations", v: profile.deviations },
    { title: "Corrective Vector", v: profile.corrective_vector },
  ];

  const sectionBlocks = sections.map(({ title, v }) => {
    const bridge = SECTION_BRIDGES[title] ?? "";
    const bridgeLine = bridge ? `${bridge}\n\n` : "";
    return `${title}\n${bridgeLine}${signalLabel}: ${v.raw_signal}\n${custodianLabel}: ${v.custodian}\n${oracleLabel}: ${v.oracle}`;
  });

  let keyMovesBlock = "";
  const archetypeName = options?.archetypeName;
  if (archetypeName && LIGS_ARCHETYPES.includes(archetypeName as LigsArchetype)) {
    const bank = getArchetypePhraseBank(archetypeName as LigsArchetype);
    const moves = [...new Set(bank.resetMoves)];
    if (moves.length > 0) {
      keyMovesBlock = `\n\nKey Moves\n${moves.map((m) => `• ${m}`).join("\n")}`;
    }
  }

  return sectionBlocks.join("\n\n") + keyMovesBlock;
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

VOICE RULES — For each ThreeVoice field, follow strictly:

RAW SIGNAL:
- 8–14 words exactly
- concrete + sensory
- NO "you", NO archetype names
- no biology jargon, no pseudo-science
- avoid raw numbers (no wavelengths like "580 nm")

CUSTODIAN:
- 2–4 sentences, second-person ("you")
- MUST include one sentence starting "In practice…"
- MUST include one sentence starting "You tend to…"
- practical: how it shows up in behavior, decisions, relationships
- grounded, modern, not woo

ORACLE:
- 1–2 sentences only
- second-person ("you")
- MUST include one concrete moment image (e.g., light through glass, first snow, falling star)
- poetic but grounded; no mystical claims, no certainty language

FORBIDDEN PHRASES / CONCEPTS — Do not use anywhere:
- organism, retinal, vestibular, axial centers, encodes this flux, biological expression follows
- any medical/scientific certainty claims

For vector_zero: Keep three_voice and beauty_baseline (use provided vector_zero when given; otherwise derive from report). Apply the same voice rules to vector_zero.three_voice.

ARCHETYPE VOICE INJECTION: When an archetype voice block is provided, align phrasing to those parameters. Use the archetype name at most once per section.

PHRASE BANK: When an archetype phrase bank block is provided, use these phrase atoms to increase specificity; do not reuse the same sentence across sections. Draw from sensoryMetaphors, behavioralTells, relationalTells, shadowDrift, and resetMoves as appropriate. Keep language modern, grounded, non-woo.

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
