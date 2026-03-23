/**
 * WHOIS protocol alignment evaluator — first deterministic protocol operation.
 * Compares observed interaction behavior against protocol. No LLM calls.
 */

import type { WhoIsProtocol, AgentDirectives } from "@/lib/whois-protocol";

/** Machine-readable observed interaction state. Agent or client provides. */
export interface ObservedState {
  response_length?: "short" | "medium" | "long";
  pacing?: "slow" | "moderate" | "fast";
  structure?: "flat" | "ordered" | "branching" | "narrative";
  decision_mode?: "binary" | "sequential" | "balanced" | "exploratory";
  friction_events?: string[];
  engagement_state?: "stable" | "drifting" | "overloaded";
}

/** Result of protocol alignment evaluation. */
export interface AlignmentResult {
  alignment_score: number;
  variance_flags: string[];
  recommended_adjustment: string[];
  confidence: "low" | "medium" | "high";
}

/** Normalize pacing for comparison. */
function normPacing(v: string): string {
  const low = String(v || "").toLowerCase();
  if (/brisk|fast|rapid/i.test(low)) return "fast";
  if (/moderate|medium|steady/i.test(low)) return "moderate";
  if (/slow|spaced|deliberate/i.test(low)) return "slow";
  if (/responsive|adaptive|match_user/i.test(low)) return "moderate"; // adaptive maps to moderate for comparison
  return "moderate";
}

/** Normalize verbosity for comparison. */
function normVerbosity(v: string): string {
  const low = String(v || "").toLowerCase();
  if (/concise|short/i.test(low)) return "short";
  if (/moderate|measured/i.test(low)) return "medium";
  if (/flexible|long|verbose/i.test(low)) return "long";
  return "medium";
}

/** Normalize structure/format for comparison. */
function normStructure(v: string): string {
  const low = String(v || "").toLowerCase();
  if (/bullets|ordered|lists/i.test(low)) return "ordered";
  if (/narrative|flow/i.test(low)) return "narrative";
  if (/declarative|flat|one_per_line/i.test(low)) return "flat";
  if (/mixed|branching|context/i.test(low)) return "branching";
  return "flat";
}

/** Normalize decision mode for comparison. */
function normDecisionMode(v: string): string {
  const low = String(v || "").toLowerCase();
  if (/binary/i.test(low)) return "binary";
  if (/sequential|numbered|phased/i.test(low)) return "sequential";
  if (/balanced|equilibrium/i.test(low)) return "balanced";
  if (/map|exploratory|incremental|reveal/i.test(low)) return "exploratory";
  return "sequential";
}

/**
 * Evaluate alignment between WHOIS protocol and observed interaction state.
 * Deterministic, no LLM. Returns score, variance flags, adjustments, confidence.
 */
export function evaluateProtocolAlignment(
  whois_protocol: WhoIsProtocol,
  observed_state: ObservedState
): AlignmentResult {
  const flags: string[] = [];
  const adjustments: string[] = [];
  let score = 100;
  const d = whois_protocol.agent_directives;

  const PACE_ORDER = ["slow", "moderate", "fast"] as const;
  const protoPacing = normPacing(d.pacing?.speed ?? "");
  const obsPacing = normPacing(observed_state.pacing ?? "moderate");
  if (protoPacing !== obsPacing) {
    const paceIdx = PACE_ORDER.indexOf(obsPacing as (typeof PACE_ORDER)[number]);
    const targetIdx = PACE_ORDER.indexOf(protoPacing as (typeof PACE_ORDER)[number]);
    const delta = Math.abs(paceIdx - targetIdx);
    score -= delta * 15;
    flags.push(`pacing_mismatch: observed ${obsPacing}, protocol expects ${protoPacing}`);
    if (targetIdx > paceIdx) {
      adjustments.push("Speed up; shorten turns; reduce pauses between points");
    } else {
      adjustments.push("Slow down; reduce tempo; add space between points");
    }
  }

  const lenOrder = ["short", "medium", "long"] as const;
  const protoVerb = normVerbosity(d.response_style?.verbosity ?? "");
  const obsLen = normVerbosity(observed_state.response_length ?? "medium");
  if (protoVerb !== obsLen) {
    score -= 12;
    flags.push(`response_length_mismatch: observed ${obsLen}, protocol expects ${protoVerb}`);
    const obsIdx = lenOrder.indexOf(obsLen as (typeof lenOrder)[number]);
    const protoIdx = lenOrder.indexOf(protoVerb as (typeof lenOrder)[number]);
    if (protoIdx < obsIdx) {
      adjustments.push("Reduce verbosity; be more concise; trim filler");
    } else {
      adjustments.push("Allow more detail; less terse; expand where needed");
    }
  }

  const protoStruct = normStructure(d.structure_rules?.format ?? "");
  const obsStruct = observed_state.structure ?? "flat";
  if (protoStruct !== obsStruct) {
    score -= 10;
    flags.push(`structure_mismatch: observed ${obsStruct}, protocol expects ${protoStruct}`);
    if (protoStruct === "ordered") {
      adjustments.push("Use bullet points or numbered list; move toward ordered presentation");
    } else if (protoStruct === "narrative") {
      adjustments.push("Connect points in narrative flow; move from list to story");
    } else if (protoStruct === "flat") {
      adjustments.push("Flatten to one idea per line; declarative; avoid branching or bullets");
    } else {
      adjustments.push("Use branching or mixed format; show connections explicitly");
    }
  }

  const protoDec = normDecisionMode(d.decision_presentation?.mode ?? "");
  const obsDec = observed_state.decision_mode ?? "sequential";
  if (protoDec !== obsDec) {
    score -= 10;
    flags.push(`decision_mode_mismatch: observed ${obsDec}, protocol expects ${protoDec}`);
    if (protoDec === "binary") {
      adjustments.push("Present as A vs B when applicable; move toward binary choice");
    } else if (protoDec === "balanced") {
      adjustments.push("Show trade-offs explicitly; no hidden asymmetry");
    } else if (protoDec === "sequential") {
      adjustments.push("Present primary path first, then alternatives; sequential not exploratory");
    } else {
      adjustments.push("Map options; show connections; allow exploratory framing");
    }
  }

  const frictionEvents = observed_state.friction_events ?? [];
  const interveneWhen = d.intervention_triggers?.intervene_when ?? [];
  /** Map observed friction labels to protocol intervention tokens. */
  const FRICTION_TO_PROTOCOL: Record<string, string[]> = {
    overload: ["burnout", "intensity_fatigue", "overextension"],
    repetition: ["rigidity", "momentum_override", "directional_lock"],
    ambiguity: ["indecision", "opacity", "delayed_reveal"],
  };
  for (const ev of frictionEvents) {
    const evNorm = ev.toLowerCase().replace(/\s+/g, "_");
    const protocolTokens = FRICTION_TO_PROTOCOL[evNorm] ?? [];
    const isProtocolSensitive = protocolTokens.some((t) => interveneWhen.includes(t));
    if (isProtocolSensitive) {
      score -= 8;
      flags.push(`friction_detected: ${ev} (protocol-sensitive)`);
      adjustments.push(`Check for ${ev}; consider brief pause or reframe`);
    } else {
      score -= 5;
      flags.push(`friction_detected: ${ev}`);
      adjustments.push(`Reduce ${ev}; clarify or simplify`);
    }
  }

  const engState = observed_state.engagement_state ?? "stable";
  if (engState === "overloaded") {
    score -= 15;
    flags.push("engagement_overloaded");
    if (d.intervention_triggers?.anchor_when?.length) {
      adjustments.push("Anchor: offer stability; reduce options");
    }
  } else if (engState === "drifting" && d.intervention_triggers?.support_when?.length) {
    score -= 5;
    flags.push("engagement_drifting_with_transition_support");
    adjustments.push("Support transition; acknowledge drift before redirecting");
  }

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  let confidence: "low" | "medium" | "high" = "medium";
  const provided = [
    observed_state.pacing,
    observed_state.response_length,
    observed_state.structure,
    observed_state.decision_mode,
    observed_state.friction_events?.length,
    observed_state.engagement_state,
  ].filter((x) => x !== undefined && x !== null);
  if (provided.length >= 4) confidence = "high";
  else if (provided.length <= 1) confidence = "low";

  return {
    alignment_score: clampedScore,
    variance_flags: [...new Set(flags)],
    recommended_adjustment: [...new Set(adjustments)].slice(0, 5),
    confidence,
  };
}
