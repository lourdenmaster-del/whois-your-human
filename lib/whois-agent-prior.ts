/**
 * Shared WHOIS agent prior builder.
 * Free path: birthDate + dominantArchetype only.
 * Paid path: adds solarSeasonProfile + vectorZero enrichment.
 * Same output shape for both; paid-only fields null when unavailable.
 */

import type { VectorZero } from "@/lib/vector-zero";
import { approximateSunLongitudeFromDate } from "@/lib/terminal-intake/approximateSunLongitude";
import { getPrimaryArchetypeFromSolarLongitude } from "@/src/ligs/image/triangulatePrompt";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import {
  getCivilizationalFunction,
  hasCivilizationalFunction,
} from "@/src/ligs/voice/civilizationalFunction";
import {
  LIGS_ARCHETYPES,
  type LigsArchetype,
} from "@/src/ligs/archetypes/contract";

export interface BuildAgentPriorInput {
  /** Used to resolve archetype when dominantArchetype/solarSeasonProfile absent. */
  birthDate?: string | null;
  /** From profile; free path sets this from derived archetype. */
  dominantArchetype?: string | null;
  /** Paid path only. From profile.solarSeasonProfile. */
  solarSeasonProfile?: {
    archetype?: string;
    seasonIndex?: number;
    lonCenterDeg?: number;
    solarDeclinationDeg?: number;
    seasonalPolarity?: string;
  } | null;
  /** Paid path only. Sun longitude from storedReport when profile lacks solar data. */
  sunLonDeg?: number | null;
  /** Paid path only. From getReport(reportId).vector_zero. */
  vectorZero?: VectorZero | null;
}

export interface AgentPriorLayer {
  derived_structure: {
    archetype: string | null;
    cosmic_twin: string | null;
    coherence_score: number | null;
    vector_zero: {
      primary_wavelength_nm: number | null;
      secondary_wavelength_nm: number | null;
      axes: {
        lateral: number | null;
        vertical: number | null;
        depth: number | null;
      };
    };
    civilizational_function: {
      structural_function: string | null;
      civilizational_role: string | null;
      contribution_environments: string[];
      friction_environments: string[];
    };
  };
  agent_directives: {
    support_style: string;
    best_response_format: string;
    planning_mode: string;
    decision_support: {
      preferred_option_count: number;
      needs_clear_tradeoffs: boolean;
      avoid_excessive_branching: boolean;
    };
    interaction_rules: {
      lead_with_structure: boolean;
      name_the_frame_before_details: boolean;
      chunk_complexity: boolean;
      confirm_major_direction_changes: boolean;
    };
    agent_do: string[];
    agent_avoid: string[];
    likely_friction_patterns: string[];
    best_use_of_this_human: string[];
  };
  agent_summary: {
    one_line: string;
    help_strategy: string;
    failure_mode: string;
    alignment_test: string;
  };
}

function isKnownArchetype(v: string | undefined): v is LigsArchetype {
  return !!v && LIGS_ARCHETYPES.includes(v as LigsArchetype);
}

/**
 * Build agent prior layer (derived_structure, agent_directives, agent_summary).
 * Free-safe: pass birthDate + dominantArchetype; vectorZero/solarSeasonProfile null.
 * Paid: pass solarSeasonProfile + vectorZero for enriched output.
 */
export function buildAgentPriorLayer(input: BuildAgentPriorInput): AgentPriorLayer {
  const {
    birthDate,
    dominantArchetype,
    solarSeasonProfile,
    sunLonDeg,
    vectorZero,
  } = input;

  // Archetype resolution: solarSeasonProfile?.archetype > dominantArchetype > sunLonDeg > birthDate > Stabiliora
  let archetypeRaw: string | null = solarSeasonProfile?.archetype ?? dominantArchetype ?? null;
  if (!archetypeRaw || archetypeRaw.trim() === "" || archetypeRaw === "—") {
    if (typeof sunLonDeg === "number" && Number.isFinite(sunLonDeg)) {
      archetypeRaw = getPrimaryArchetypeFromSolarLongitude(sunLonDeg);
    } else if (birthDate?.trim()) {
      const lon = approximateSunLongitudeFromDate(birthDate.trim().slice(0, 10));
      archetypeRaw = lon != null ? getPrimaryArchetypeFromSolarLongitude(lon) : "Stabiliora";
    } else {
      archetypeRaw = "Stabiliora";
    }
  }

  const archetype = archetypeRaw as string | null;
  const knownArchetype = isKnownArchetype(archetype ?? undefined)
    ? (archetype as Parameters<typeof getCosmicAnalogue>[0])
    : null;
  const cosmicTwin = knownArchetype
    ? getCosmicAnalogue(knownArchetype).phenomenon
    : null;

  const coherenceScore =
    typeof vectorZero?.coherence_score === "number"
      ? vectorZero.coherence_score
      : null;

  const cf =
    knownArchetype && hasCivilizationalFunction(knownArchetype)
      ? getCivilizationalFunction(knownArchetype)
      : null;

  const supportStyle = cf
    ? `Support through ${cf.structuralFunction}`
    : "Support through clear structure, concise options, and explicit tradeoffs.";
  const friction = cf ? [...cf.frictionEnvironments] : [];
  const contribution = cf ? [...cf.contributionEnvironments] : [];

  const toWavelengthNm = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  return {
    derived_structure: {
      archetype: knownArchetype,
      cosmic_twin: cosmicTwin,
      coherence_score: coherenceScore,
      vector_zero: {
        primary_wavelength_nm: toWavelengthNm(vectorZero?.primary_wavelength),
        secondary_wavelength_nm: toWavelengthNm(vectorZero?.secondary_wavelength),
        axes: {
          lateral: vectorZero?.symmetry_profile?.lateral ?? null,
          vertical: vectorZero?.symmetry_profile?.vertical ?? null,
          depth: vectorZero?.symmetry_profile?.depth ?? null,
        },
      },
      civilizational_function: {
        structural_function: cf?.structuralFunction ?? null,
        civilizational_role: cf?.civilizationalRole ?? null,
        contribution_environments: contribution,
        friction_environments: friction,
      },
    },
    agent_directives: {
      support_style: supportStyle,
      best_response_format:
        "Lead with structure, then provide concise options with explicit tradeoffs.",
      planning_mode: "prediction-first with checkpointed direction changes",
      decision_support: {
        preferred_option_count: 2,
        needs_clear_tradeoffs: true,
        avoid_excessive_branching: true,
      },
      interaction_rules: {
        lead_with_structure: true,
        name_the_frame_before_details: true,
        chunk_complexity: true,
        confirm_major_direction_changes: true,
      },
      agent_do: contribution.slice(0, 4),
      agent_avoid: friction.slice(0, 4),
      likely_friction_patterns: friction.slice(0, 4),
      best_use_of_this_human: contribution.slice(0, 4),
    },
    agent_summary: {
      one_line:
        knownArchetype && cf
          ? `${knownArchetype} structure with strongest contribution in ${cf.contributionEnvironments[0] ?? "defined contribution environments"}.`
          : "Archetype structure available; apply prediction-first support and validate against behavior.",
      help_strategy:
        "Start with two structured options, state tradeoffs, and confirm direction before branching.",
      failure_mode:
        friction[0] ??
        "Excessive branching and unframed detail can reduce response coherence.",
      alignment_test:
        "Check whether structured, role-aligned options increase response clarity and decision speed.",
    },
  };
}
