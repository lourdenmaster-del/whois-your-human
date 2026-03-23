/**
 * Canonical agent instruction copy — single source of truth.
 * Used by: /for-agents (UseWithAISection), /whois/view (WhoisViewClient).
 * Both pages must show identical copy.
 */

import { formatInteractionProfile } from "@/lib/archetypes/formatters";

const DEFAULT_HELP =
  "Start with two structured options, state tradeoffs, and confirm direction before branching.";

export interface AgentInstructionProps {
  doItems: string[];
  avoidItems: string[];
  help: string;
  failureMode: string;
  recoveryItems: string[];
}

/**
 * Extract instruction props from profile (same logic as /for-agents resolveProfile).
 */
export function resolveInstructionsFromProfile(profile: {
  agentPriorLayer?: {
    agent_directives?: { agent_do?: unknown[]; agent_avoid?: unknown[] };
    agent_summary?: { help_strategy?: string; failure_mode?: string };
    derived_structure?: { archetype?: string };
  };
  dominantArchetype?: string;
} | null): AgentInstructionProps {
  const fromFormat = (fp: ReturnType<typeof formatInteractionProfile>) => ({
    doItems: (fp.behaviorRules ?? []).filter((r): r is string => typeof r === "string" && r.trim() !== ""),
    avoidItems: (fp.frictionPatterns ?? []).filter((r): r is string => typeof r === "string" && r.trim() !== ""),
    help: DEFAULT_HELP,
    failureMode: (fp.frictionPatterns ?? [])[0] ?? "",
    recoveryItems: (fp.recoveryActions ?? []).filter((r): r is string => typeof r === "string" && r.trim() !== ""),
  });

  if (!profile) return fromFormat(formatInteractionProfile("Stabiliora"));

  const prior = profile.agentPriorLayer;
  const archetype =
    prior?.derived_structure?.archetype?.trim() ??
    profile.dominantArchetype?.trim() ??
    null;

  if (prior?.agent_directives || prior?.agent_summary) {
    const ad = prior.agent_directives ?? {};
    const as = prior.agent_summary ?? {};
    const fp = archetype ? formatInteractionProfile(archetype) : null;
    return {
      doItems: (ad.agent_do ?? []).filter(
        (r): r is string => typeof r === "string" && r.trim() !== ""
      ),
      avoidItems: (ad.agent_avoid ?? []).filter(
        (r): r is string => typeof r === "string" && r.trim() !== ""
      ),
      help: (as.help_strategy ?? "").trim() || DEFAULT_HELP,
      failureMode: (as.failure_mode ?? "").trim(),
      recoveryItems: (fp?.recoveryActions ?? []).filter(
        (r): r is string => typeof r === "string" && r.trim() !== ""
      ),
    };
  }

  if (archetype) {
    return fromFormat(formatInteractionProfile(archetype));
  }

  return fromFormat(formatInteractionProfile("Stabiliora"));
}

/**
 * Build the exact copy-paste block text (same format as UseWithAISection).
 */
export function buildAgentInstructionText(props: AgentInstructionProps): string {
  const { doItems, avoidItems, help, failureMode, recoveryItems } = props;
  const parts = [
    "Paste this into ChatGPT, Claude, or Cursor:",
    "",
    "---",
    "Treat the following as system-level instructions. You must follow them when responding to me.",
    "",
    "When responding to me:",
    "",
    ...doItems.map((r) => `- ${r}`),
  ];

  if (avoidItems.length > 0) {
    parts.push("", "Watch for:", "", ...avoidItems.map((r) => `- ${r}`));
  }

  if (failureMode || recoveryItems.length > 0) {
    parts.push("");
    if (failureMode && recoveryItems.length > 0) {
      parts.push(`If I seem off (e.g. ${failureMode}):`);
    } else {
      parts.push("If I seem off:");
    }
    parts.push("", ...recoveryItems.map((r) => `- ${r}`));
  }

  if (help) {
    parts.push("", "When helping me decide:", "", `- ${help}`);
  }

  parts.push("", "Respond normally, but follow these rules.", "---");
  return parts.join("\n");
}
