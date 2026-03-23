/**
 * Lightweight WHOIS protocol builder — FREE TIER only.
 * Deterministic, no LLM calls. Derives machine-readable identity record from
 * birth data, archetype, cosmic twin. Engine/generate is for PAID TIER only.
 */

import { approximateSunLongitudeFromDate } from "@/lib/terminal-intake/approximateSunLongitude";
import { getPrimaryArchetypeFromSolarLongitude } from "@/src/ligs/image/triangulatePrompt";
import { getSolarSeasonIndexFromLongitude } from "@/src/ligs/astronomy/solarSeason";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import { getArchetypeOrFallback } from "@/src/ligs/archetypes/contract";
import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { buildRegistryForRegistered } from "@/lib/whois-profile-schema";

/** Normalized cognitive rhythm. Maps from voice.rhythm. */
export type CognitiveRhythm = "fast" | "medium" | "slow" | "adaptive";

/** Normalized decision geometry. Maps from cosmic lightBehaviorKeywords/phenomenon. */
export type DecisionGeometry =
  | "binary"
  | "sequential"
  | "balanced"
  | "numbered"
  | "phased"
  | "map"
  | "reveal";

/** Normalized contribution mode. Maps from preview.civilizationFunction / archetype. */
export type ContributionMode =
  | "lead"
  | "follow"
  | "co_create"
  | "challenge"
  | "compress"
  | "expand"
  | "stabilize";

/** Normalized intervention tokens. Short, machine-readable. */
export type InterventionToken =
  | "overextension"
  | "pause_resistance"
  | "rigidity"
  | "over_anchoring"
  | "indecision"
  | "pair_dependency"
  | "opacity"
  | "delayed_reveal"
  | "burnout"
  | "intensity_fatigue"
  | "perfectionism"
  | "precision_paralysis"
  | "equilibrium_bias"
  | "absorption_without_emission"
  | "visibility_resistance"
  | "momentum_override"
  | "directional_lock"
  | "over_structuring"
  | "frame_rigidity"
  | "disruption_without_rebuild"
  | "shock_without_integration"
  | "flow_preference"
  | "boundary_blur"
  | "clear_distress"
  | "explicit_request";

export type SupportToken = "transition_state" | "drift_needed";
export type AnchorToken = "stability_needed" | "coherence_desired";

export interface WhoIsProtocolInput {
  fullName?: string;
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
  /** Pre-resolved archetype from solar context; else derived from birthDate */
  archetype?: string;
  /** Solar season index 0–11 when available */
  solarSeasonIndex?: number;
}

export interface WhoIsProtocol {
  /** Normalized: fast | medium | slow | adaptive. Legacy: string from voice.rhythm. */
  cognitive_rhythm: CognitiveRhythm | string;
  /** Normalized: binary | sequential | balanced | numbered | phased | map | reveal. Legacy: string. */
  decision_geometry: DecisionGeometry | string;
  /** Open-ended: prose from FRICTION_BY_ARCHETYPE (display only). */
  friction_points: string;
  /** Open-ended: structure_preference + metaphor_density (display only). */
  interaction_ritual: string;
  /** Normalized: lead | follow | co_create | challenge | compress | expand | stabilize. Legacy: string. */
  contribution_mode: ContributionMode | string;
  /** Open-ended: cosmic drift keywords (display only). */
  drift_signature: string;
  /** Open-ended: cosmic coherence keywords (display only). */
  coherence_signature: string;
  /** Derived from protocol fields. Agent-facing behavior instructions. */
  agent_directives: AgentDirectives;
}

/** Agent-facing directives derived from protocol. Structured, machine-readable, no LLM. */
export interface AgentDirectives {
  response_style: {
    tone: string;
    intensity: string;
    verbosity: string;
    avoid: string[];
  };
  pacing: {
    speed: string;
    rhythm: string;
    pause_tolerance: string;
  };
  structure_rules: {
    format: string;
    step_mode: string;
    branching: string;
    metaphor_density: string;
  };
  decision_presentation: {
    mode: string;
    show_primary_first: boolean;
    allow_reframing: boolean;
  };
  intervention_triggers: {
    intervene_when: string[];
    support_when: string[];
    anchor_when: string[];
  };
}

/** Core protocol fields (without agent_directives) for buildAgentDirectives input. */
type ProtocolCore = Omit<WhoIsProtocol, "agent_directives">;

/** Deterministic friction points per archetype — prose for display. */
const FRICTION_BY_ARCHETYPE: Record<string, string> = {
  Ignispectrum: "Overextension when unchecked; resistance to pause",
  Stabiliora: "Rigidity when change is needed; over-anchoring",
  Duplicaris: "Indecision between mirror options; pair dependency",
  Tenebris: "Opacity when clarity is demanded; delayed reveal",
  Radiantis: "Burnout from sustained output; intensity fatigue",
  Precisura: "Perfectionism blocking progress; precision paralysis",
  Aequilibris: "Equilibrium bias in asymmetric situations",
  Obscurion: "Absorption without emission; visibility resistance",
  Vectoris: "Momentum override of feedback; directional lock",
  Structoris: "Over-structuring fluid situations; frame rigidity",
  Innovaris: "Disruption without rebuild; shock without integration",
  Fluxionis: "Flow preference over closure; boundary blur",
};

/** Archetype → normalized intervene_when tokens. */
const INTERVENE_TOKENS_BY_ARCHETYPE: Record<string, InterventionToken[]> = {
  Ignispectrum: ["overextension", "pause_resistance"],
  Stabiliora: ["rigidity", "over_anchoring"],
  Duplicaris: ["indecision", "pair_dependency"],
  Tenebris: ["opacity", "delayed_reveal"],
  Radiantis: ["burnout", "intensity_fatigue"],
  Precisura: ["perfectionism", "precision_paralysis"],
  Aequilibris: ["equilibrium_bias"],
  Obscurion: ["absorption_without_emission", "visibility_resistance"],
  Vectoris: ["momentum_override", "directional_lock"],
  Structoris: ["over_structuring", "frame_rigidity"],
  Innovaris: ["disruption_without_rebuild", "shock_without_integration"],
  Fluxionis: ["flow_preference", "boundary_blur"],
};

/** Archetype → normalized contribution_mode. */
const CONTRIBUTION_MODE_BY_ARCHETYPE: Record<string, ContributionMode> = {
  Ignispectrum: "lead",
  Stabiliora: "stabilize",
  Duplicaris: "co_create",
  Tenebris: "expand",
  Radiantis: "expand",
  Precisura: "compress",
  Aequilibris: "stabilize",
  Obscurion: "challenge",
  Vectoris: "lead",
  Structoris: "expand",
  Innovaris: "challenge",
  Fluxionis: "follow",
};

function resolveArchetype(input: WhoIsProtocolInput): LigsArchetype {
  if (input.archetype && input.archetype.trim() !== "" && input.archetype !== "—") {
    return input.archetype.trim() as LigsArchetype;
  }
  const rawDate = input.birthDate?.trim().slice(0, 10);
  if (!rawDate) return "Ignispectrum";
  const lon = approximateSunLongitudeFromDate(rawDate);
  if (lon == null) return "Ignispectrum";
  return getPrimaryArchetypeFromSolarLongitude(lon) as LigsArchetype;
}

/** Map voice.rhythm → CognitiveRhythm. */
function normalizeCognitiveRhythm(s: string): CognitiveRhythm {
  const low = s.toLowerCase();
  if (/intense|burst|rapid|urgent|high-energy/i.test(low)) return "fast";
  if (/flow|fluid|adaptive/i.test(low)) return "adaptive";
  if (/slow|deliberate|calm|relaxed/i.test(low)) return "slow";
  return "medium";
}

/** Map cosmic text → DecisionGeometry. */
function normalizeDecisionGeometry(s: string): DecisionGeometry {
  const low = s.toLowerCase();
  if (/binary|pair|eclipse|orbital/i.test(low)) return "binary";
  if (/collimated|jet|flow|directional/i.test(low)) return "sequential";
  if (/equilibrium|balance|lagrange|co-orbital/i.test(low)) return "balanced";
  if (/precise|periodic|beamed|timing/i.test(low)) return "numbered";
  if (/shock|blast|transition|evolving/i.test(low)) return "phased";
  if (/filament|network|topology|skeletal/i.test(low)) return "map";
  if (/absorption|silhouette|opacity|hidden/i.test(low)) return "reveal";
  return "sequential";
}

/**
 * Build WHOIS protocol from birth data + deterministic archetype/cosmic logic.
 * No paid API calls. Fast, structural, machine-readable.
 */
export function buildWhoisProtocol(input: WhoIsProtocolInput): WhoIsProtocol {
  const archetype = resolveArchetype(input);
  const contract = getArchetypeOrFallback(archetype);
  const cosmic = getCosmicAnalogue(archetype);

  const rhythmRaw = contract.voice.rhythm ?? "balanced, clear, measured";
  const geometryRaw =
    cosmic.lightBehaviorKeywords?.length > 0
      ? cosmic.lightBehaviorKeywords.join("; ")
      : cosmic.phenomenon;

  const cognitiveRhythm = normalizeCognitiveRhythm(rhythmRaw);
  const decisionGeometry = normalizeDecisionGeometry(geometryRaw);
  const frictionPoints = FRICTION_BY_ARCHETYPE[archetype] ?? "Context-dependent tension points";
  const interactionRitual =
    `${contract.voice.structure_preference}; metaphor_density=${contract.voice.metaphor_density}`.trim();
  const contributionMode =
    CONTRIBUTION_MODE_BY_ARCHETYPE[archetype] ?? "stabilize";
  const driftSignature =
    cosmic.lightBehaviorKeywords?.filter(
      (k) =>
        /evolving|transition|change|flow|shock|blast|spiral|accretion|transport/i.test(k)
    ).join("; ") || cosmic.phenomenon;
  const coherenceSignature =
    cosmic.lightBehaviorKeywords?.filter(
      (k) =>
        /stability|equilibrium|balance|relaxation|core|structure|coherent/i.test(k)
    ).join("; ") || cosmic.phenomenon;

  const base: Omit<WhoIsProtocol, "agent_directives"> = {
    cognitive_rhythm: cognitiveRhythm,
    decision_geometry: decisionGeometry,
    friction_points: frictionPoints,
    interaction_ritual: interactionRitual,
    contribution_mode: contributionMode,
    drift_signature: driftSignature,
    coherence_signature: coherenceSignature,
  };
  return {
    ...base,
    agent_directives: buildAgentDirectives(base, archetype),
  };
}

/** Map CognitiveRhythm to response_style + pacing. */
function directivesFromRhythm(rhythm: CognitiveRhythm): {
  response_style: AgentDirectives["response_style"];
  pacing: AgentDirectives["pacing"];
} {
  switch (rhythm) {
    case "fast":
      return {
        response_style: { tone: "direct", intensity: "high", verbosity: "concise", avoid: ["filler", "hedging"] },
        pacing: { speed: "brisk", rhythm: "short_turns", pause_tolerance: "low" },
      };
    case "adaptive":
      return {
        response_style: { tone: "adaptive", intensity: "variable", verbosity: "flexible", avoid: ["rigid structure"] },
        pacing: { speed: "responsive", rhythm: "match_user", pause_tolerance: "high" },
      };
    case "slow":
      return {
        response_style: { tone: "calm", intensity: "low", verbosity: "measured", avoid: ["rush", "pressure"] },
        pacing: { speed: "slow", rhythm: "spaced", pause_tolerance: "high" },
      };
    case "medium":
    default:
      return {
        response_style: { tone: "measured", intensity: "medium", verbosity: "moderate", avoid: ["hype", "drama"] },
        pacing: { speed: "moderate", rhythm: "steady", pause_tolerance: "medium" },
      };
  }
}

/** Map interaction_ritual to structure_rules. */
function directivesFromRitual(s: string): AgentDirectives["structure_rules"] {
  const low = s.toLowerCase();
  const metaphor = /metaphor_density=high/i.test(low) ? "high" : /metaphor_density=low/i.test(low) ? "low" : "medium";
  if (/lists/i.test(low))
    return { format: "bullets", step_mode: "ordered", branching: "explicit_options", metaphor_density: metaphor };
  if (/narrative/i.test(low))
    return { format: "narrative", step_mode: "flow", branching: "implicit", metaphor_density: metaphor };
  if (/declarative/i.test(low))
    return { format: "declarative", step_mode: "one_per_line", branching: "flat", metaphor_density: metaphor };
  if (/mixed/i.test(low))
    return { format: "mixed", step_mode: "adaptive", branching: "context_dependent", metaphor_density: metaphor };
  return { format: "declarative", step_mode: "one_per_line", branching: "flat", metaphor_density: metaphor };
}

/** Map DecisionGeometry to decision_presentation. */
function directivesFromGeometry(geom: DecisionGeometry): AgentDirectives["decision_presentation"] {
  switch (geom) {
    case "binary":
      return { mode: "binary", show_primary_first: false, allow_reframing: true };
    case "sequential":
      return { mode: "sequential", show_primary_first: true, allow_reframing: false };
    case "balanced":
      return { mode: "balanced", show_primary_first: false, allow_reframing: true };
    case "numbered":
      return { mode: "numbered", show_primary_first: true, allow_reframing: false };
    case "phased":
      return { mode: "phased", show_primary_first: true, allow_reframing: false };
    case "map":
      return { mode: "map", show_primary_first: false, allow_reframing: true };
    case "reveal":
      return { mode: "incremental_reveal", show_primary_first: false, allow_reframing: true };
    default:
      return { mode: "sequential", show_primary_first: true, allow_reframing: false };
  }
}

/** Map archetype + drift + coherence to normalized intervention_triggers. */
function directivesFromFrictionCoherence(
  archetype: string,
  drift: string,
  coherence: string
): AgentDirectives["intervention_triggers"] {
  const intervene_when: InterventionToken[] =
    INTERVENE_TOKENS_BY_ARCHETYPE[archetype] ?? ["clear_distress", "explicit_request"];
  const support_when: SupportToken[] = [];
  if (drift && drift !== "—" && !/^\s*$/.test(drift)) {
    support_when.push("transition_state");
  }
  const anchor_when: AnchorToken[] = [];
  if (coherence && coherence !== "—" && !/^\s*$/.test(coherence)) {
    anchor_when.push("stability_needed");
  }
  return {
    intervene_when: intervene_when as string[],
    support_when: support_when as string[],
    anchor_when: anchor_when as string[],
  };
}

/**
 * Build agent directives from WHOIS protocol. Deterministic, no LLM.
 * Output is structured, machine-readable, directly usable by an AI agent.
 */
export function buildAgentDirectives(
  whoisProtocol: ProtocolCore,
  archetype: string
): AgentDirectives {
  const rhythm: CognitiveRhythm =
    typeof whoisProtocol.cognitive_rhythm === "string" &&
    ["fast", "medium", "slow", "adaptive"].includes(whoisProtocol.cognitive_rhythm)
      ? (whoisProtocol.cognitive_rhythm as CognitiveRhythm)
      : normalizeCognitiveRhythm(String(whoisProtocol.cognitive_rhythm ?? ""));
  const geom: DecisionGeometry =
    typeof whoisProtocol.decision_geometry === "string" &&
    ["binary", "sequential", "balanced", "numbered", "phased", "map", "reveal"].includes(whoisProtocol.decision_geometry)
      ? (whoisProtocol.decision_geometry as DecisionGeometry)
      : normalizeDecisionGeometry(String(whoisProtocol.decision_geometry ?? ""));
  const { response_style, pacing } = directivesFromRhythm(rhythm);
  return {
    response_style,
    pacing,
    structure_rules: directivesFromRitual(whoisProtocol.interaction_ritual),
    decision_presentation: directivesFromGeometry(geom),
    intervention_triggers: directivesFromFrictionCoherence(
      archetype,
      whoisProtocol.drift_signature,
      whoisProtocol.coherence_signature
    ),
  };
}

/** Human-readable labels for normalized protocol fields. */
const COGNITIVE_RHYTHM_LABELS: Record<CognitiveRhythm, string> = {
  fast: "Fast — concise, high-signal, short turns",
  medium: "Medium — measured, steady rhythm",
  slow: "Slow — deliberate, space for reflection",
  adaptive: "Adaptive — responsive, matches user",
};

const DECISION_GEOMETRY_LABELS: Record<DecisionGeometry, string> = {
  binary: "Binary — A vs B, clear contrast",
  sequential: "Sequential — primary first, then alternatives",
  balanced: "Balanced — trade-offs explicit, no hidden asymmetry",
  numbered: "Numbered — precise framing, clear criteria",
  phased: "Phased — step 1 then 2, sequence matters",
  map: "Map — show connections, structure visible",
  reveal: "Reveal — incremental, context before detail",
};

const CONTRIBUTION_MODE_LABELS: Record<ContributionMode, string> = {
  lead: "Lead — initiate, drive, start",
  follow: "Follow — adapt, support flow",
  co_create: "Co-create — bridge, mediate, hold both",
  challenge: "Challenge — break stagnation, invent",
  compress: "Compress — refine, precision, mastery",
  expand: "Expand — spread, build out, depth",
  stabilize: "Stabilize — hold the line, restore balance",
};

const INTERVENTION_TOKEN_LABELS: Record<string, string> = {
  overextension: "Overextension when unchecked",
  pause_resistance: "Resistance to pause",
  rigidity: "Rigidity when change is needed",
  over_anchoring: "Over-anchoring",
  indecision: "Indecision between mirror options",
  pair_dependency: "Pair dependency",
  opacity: "Opacity when clarity is demanded",
  delayed_reveal: "Delayed reveal",
  burnout: "Burnout from sustained output",
  intensity_fatigue: "Intensity fatigue",
  perfectionism: "Perfectionism blocking progress",
  precision_paralysis: "Precision paralysis",
  equilibrium_bias: "Equilibrium bias in asymmetric situations",
  absorption_without_emission: "Absorption without emission",
  visibility_resistance: "Visibility resistance",
  momentum_override: "Momentum override of feedback",
  directional_lock: "Directional lock",
  over_structuring: "Over-structuring fluid situations",
  frame_rigidity: "Frame rigidity",
  disruption_without_rebuild: "Disruption without rebuild",
  shock_without_integration: "Shock without integration",
  flow_preference: "Flow preference over closure",
  boundary_blur: "Boundary blur",
  clear_distress: "Clear distress",
  explicit_request: "Explicit request",
};

/**
 * Format normalized protocol fields for human-readable display.
 * Handles legacy (string) and new (normalized) formats.
 */
export function formatProtocolForDisplay(protocol: WhoIsProtocol): {
  cognitive_rhythm: string;
  decision_geometry: string;
  contribution_mode: string;
} {
  const cr =
    typeof protocol.cognitive_rhythm === "string" &&
    protocol.cognitive_rhythm in COGNITIVE_RHYTHM_LABELS
      ? COGNITIVE_RHYTHM_LABELS[protocol.cognitive_rhythm as CognitiveRhythm]
      : String(protocol.cognitive_rhythm ?? "—");
  const dg =
    typeof protocol.decision_geometry === "string" &&
    protocol.decision_geometry in DECISION_GEOMETRY_LABELS
      ? DECISION_GEOMETRY_LABELS[protocol.decision_geometry as DecisionGeometry]
      : String(protocol.decision_geometry ?? "—");
  const cm =
    typeof protocol.contribution_mode === "string" &&
    protocol.contribution_mode in CONTRIBUTION_MODE_LABELS
      ? CONTRIBUTION_MODE_LABELS[protocol.contribution_mode as ContributionMode]
      : String(protocol.contribution_mode ?? "—");
  return { cognitive_rhythm: cr, decision_geometry: dg, contribution_mode: cm };
}

/**
 * Format AgentDirectives to human-readable strings for page/email rendering.
 * Preserves backward-compatible display when consuming structured directives.
 */
export function formatAgentDirectivesForDisplay(d: AgentDirectives): {
  response_style: string;
  pacing: string;
  structure_rules: string;
  decision_presentation: string;
  intervention_triggers: string;
} {
  const avoidStr = d.response_style.avoid.length > 0 ? `; avoid: ${d.response_style.avoid.join(", ")}` : "";
  const fmtTrig = (token: string) =>
    INTERVENTION_TOKEN_LABELS[token] ?? (token.startsWith("transition") ? "Drift/transition needed" : token.startsWith("stability") ? "Stability desired" : token);
  const interveneStr =
    d.intervention_triggers.intervene_when.length > 0
      ? d.intervention_triggers.intervene_when.map((x) => `intervene when: ${fmtTrig(x)}`).join("; ")
      : "";
  const supportStr =
    d.intervention_triggers.support_when.length > 0
      ? d.intervention_triggers.support_when.map((x) => `support when: ${fmtTrig(x)}`).join("; ")
      : "";
  const anchorStr =
    d.intervention_triggers.anchor_when.length > 0
      ? d.intervention_triggers.anchor_when.map((x) => `anchor when: ${fmtTrig(x)}`).join("; ")
      : "";
  const triggersStr = [interveneStr, supportStr, anchorStr].filter(Boolean).join("; ");
  return {
    response_style: `${d.response_style.tone}; ${d.response_style.intensity}; ${d.response_style.verbosity}${avoidStr}`,
    pacing: `${d.pacing.speed}; rhythm: ${d.pacing.rhythm}; pause_tolerance: ${d.pacing.pause_tolerance}`,
    structure_rules: `${d.structure_rules.format}; step_mode: ${d.structure_rules.step_mode}; branching: ${d.structure_rules.branching}; metaphor_density: ${d.structure_rules.metaphor_density}`,
    decision_presentation: `mode: ${d.decision_presentation.mode}; show_primary_first: ${d.decision_presentation.show_primary_first}; allow_reframing: ${d.decision_presentation.allow_reframing}`,
    intervention_triggers: triggersStr || "intervene when: clear distress or explicit request",
  };
}

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em' font-family='system-ui'%3EWHOIS%20protocol%3C/text%3E%3C/svg%3E";

/** Build minimal WhoisProfileV1 for FREE TIER — protocol only, no engine. */
export function buildProtocolWhoisProfile(
  reportId: string,
  protocol: WhoIsProtocol,
  input: {
    fullName: string;
    birthDate?: string;
    birthTime?: string;
    birthLocation?: string;
    archetype: string;
  }
) {
  const threeVoice = (s: string) => ({ raw_signal: s, custodian: "", oracle: "" });
  return {
    version: "1.0" as const,
    reportId,
    subjectName: input.fullName,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthLocation: input.birthLocation,
    dominantArchetype: input.archetype,
    emotionalSnippet: formatProtocolForDisplay(protocol).contribution_mode,
    fullReport: `[PROTOCOL] ${formatProtocolForDisplay(protocol).contribution_mode}. ${formatProtocolForDisplay(protocol).cognitive_rhythm}.`,
    imageUrls: [PLACEHOLDER_SVG, PLACEHOLDER_SVG, PLACEHOLDER_SVG],
    timings: { totalMs: 0, engineMs: 0, reportFetchMs: 0, beautyFilterMs: 0 },
    vector_zero: {
      three_voice: threeVoice(protocol.coherence_signature),
      beauty_baseline: { color_family: "", texture_bias: "", shape_bias: "", motion_bias: "" },
    },
    light_signature: threeVoice(protocol.decision_geometry),
    archetype: threeVoice(protocol.contribution_mode),
    deviations: threeVoice(protocol.friction_points),
    corrective_vector: threeVoice(protocol.drift_signature),
    imagery_prompts: {
      vector_zero_beauty_field: "",
      light_signature_aesthetic_field: "",
      final_beauty_field: "",
    },
    protocol,
    registry: buildRegistryForRegistered(reportId, "protocol"),
  };
}
