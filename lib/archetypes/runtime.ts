/**
 * Runtime behavior adapter — converts canonical archetype into executable assistant rules.
 * Thin layer: aiInstructions → behavior rules; failureModes/correctionProtocol for drift only.
 * FREE tier: basic rules (2–3), no drift. PAID tier: full rules + drift/correction/fallback.
 */

import { getCanonicalArchetype, getNeutralCanonical } from "./data";
import { analyzeDrift, type DriftSeverity } from "./drift";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";

export type ArchetypeRuntimeProfile = {
  archetype: string;
  machineRole: string;
  behaviorRules: string[];
  driftSeverity?: DriftSeverity;
  activeCorrection?: string[];
  fallbackMode?: "none" | "neutral_stabilization";
};

export type BehaviorTier = "free" | "paid";

const FREE_RULE_LIMIT = 3;

function isKnownArchetype(s: string): boolean {
  return !!s && LIGS_ARCHETYPES.includes(s as (typeof LIGS_ARCHETYPES)[number]);
}

/** Parse aiInstructions into discrete rules (semicolon-separated clauses). */
function aiInstructionsToRules(aiInstructions: string): string[] {
  return aiInstructions
    .split(/;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Trim rules to free tier limit (2–3 items). */
function toFreeRules(rules: string[]): string[] {
  return rules.slice(0, FREE_RULE_LIMIT);
}

/**
 * Build runtime profile for an archetype.
 * FREE: 2–3 rules, no drift/activeCorrection/fallbackMode.
 * PAID: full rules; when observedSignals present, runs drift analysis.
 */
export function buildBehaviorProfile(
  archetype: string,
  observedSignals?: readonly string[] | null,
  tier: BehaviorTier = "free"
): ArchetypeRuntimeProfile {
  if (tier === "free") {
    if (!archetype?.trim() || !isKnownArchetype(archetype.trim())) {
      const neutral = getNeutralCanonical();
      const rules = toFreeRules(
        aiInstructionsToRules(neutral.aiInstructions)
      );
      return {
        archetype: neutral.id,
        machineRole: neutral.machineRole,
        behaviorRules: rules,
      };
    }
    const canon = getCanonicalArchetype(archetype);
    return {
      archetype: canon.id,
      machineRole: canon.machineRole,
      behaviorRules: toFreeRules(aiInstructionsToRules(canon.aiInstructions)),
    };
  }

  // PAID tier
  if (!archetype?.trim() || !isKnownArchetype(archetype.trim())) {
    const neutral = getNeutralCanonical();
    return {
      archetype: neutral.id,
      machineRole: neutral.machineRole,
      behaviorRules: aiInstructionsToRules(neutral.aiInstructions),
      driftSeverity: "none",
      activeCorrection: [...neutral.correctionProtocol].slice(0, 2),
      fallbackMode: "neutral_stabilization",
    };
  }

  if (!observedSignals || observedSignals.length === 0) {
    const canon = getCanonicalArchetype(archetype);
    return {
      archetype: canon.id,
      machineRole: canon.machineRole,
      behaviorRules: aiInstructionsToRules(canon.aiInstructions),
      fallbackMode: "none",
    };
  }

  const drift = analyzeDrift(archetype, observedSignals);

  if (drift.severity === "severe") {
    const neutral = getNeutralCanonical();
    return {
      archetype: neutral.id,
      machineRole: neutral.machineRole,
      behaviorRules: aiInstructionsToRules(neutral.aiInstructions),
      driftSeverity: "severe",
      activeCorrection:
        drift.suggestedCorrections.length > 0
          ? drift.suggestedCorrections
          : [...neutral.correctionProtocol].slice(0, 2),
      fallbackMode: "neutral_stabilization",
    };
  }

  const canon = getCanonicalArchetype(archetype);
  return {
    archetype: canon.id,
    machineRole: canon.machineRole,
    behaviorRules: aiInstructionsToRules(canon.aiInstructions),
    driftSeverity: drift.severity,
    activeCorrection:
      drift.severity !== "none" ? drift.suggestedCorrections : undefined,
    fallbackMode: "none",
  };
}

/**
 * Build injectable behavior instructions (plain text for system prompts).
 * FREE: archetype, machine role, behavior rules only.
 * PAID: full output including drift state, active correction, fallback (when present).
 */
export function buildBehaviorInstructions(
  archetype: string,
  observedSignals?: readonly string[] | null,
  tier: BehaviorTier = "free"
): string {
  const profile = buildBehaviorProfile(archetype, observedSignals, tier);

  const lines: string[] = [
    `Active archetype: ${profile.archetype}`,
    `Machine role: ${profile.machineRole}`,
    "",
    "Behavior rules:",
    ...profile.behaviorRules.map((r) => `- ${r}`),
  ];

  if (tier === "paid") {
    lines.push("", `Drift state: ${profile.driftSeverity ?? "none"}`);

    if (profile.activeCorrection && profile.activeCorrection.length > 0) {
      lines.push("", "Active correction:");
      for (const c of profile.activeCorrection) {
        lines.push(`- ${c}`);
      }
    }

    if (profile.fallbackMode === "neutral_stabilization") {
      lines.push("", `Fallback mode: ${profile.fallbackMode}`);
    }
  }

  return lines.join("\n");
}

/**
 * Build behavior profile with drift awareness. Thin wrapper over buildBehaviorProfile.
 * Uses PAID tier (full behavior).
 */
export function applyDriftAwareBehavior(
  archetype: string,
  observedSignals?: readonly string[] | null
): ArchetypeRuntimeProfile {
  return buildBehaviorProfile(archetype, observedSignals, "paid");
}
