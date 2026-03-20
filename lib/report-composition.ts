/**
 * Report composition layer — deterministic sentence assembly from profile data.
 * Converts phrase-bank fragments into complete sentences. No repetition of archetype
 * resolution or cosmic analogue (those appear once in TerminalResolutionSequence).
 */

import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { getArchetypePhraseBank } from "@/src/ligs/voice/archetypePhraseBank";
import { getArchetypePreviewConfig } from "@/lib/archetype-preview-config";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import {
  getCivilizationalFunction,
  hasCivilizationalFunction,
} from "@/src/ligs/voice/civilizationalFunction";

function hasContent(v: unknown): v is string {
  return v != null && typeof v === "string" && v.trim() !== "" && v !== "—";
}

function parseKeyMoves(text: string | undefined): string[] {
  if (!text || typeof text !== "string") return [];
  const idx = text.search(/\nKey Moves\n/);
  if (idx < 0) return [];
  const part = text.slice(idx + 1);
  if (!part.startsWith("Key Moves")) return [];
  return part
    .split("\n")
    .slice(1)
    .map((l) => l.replace(/^[•\-]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

/** Convert comma-separated list into readable practice phrase. */
function keyMovesToPracticePhrase(moves: string[]): string {
  if (moves.length === 0) return "";
  const first = moves[0];
  if (!first) return "";
  const parts = first.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  const last = parts.pop();
  const rest = parts.join(", ");
  return rest ? `${rest}, and ${last}` : (last ?? "");
}

/** Returns one sentence for Step 1. Calm, observational; not bureaucratic. Does not repeat "This resolves into X". */
export function composeArchetypeOpening(
  profile: { dominantArchetype?: string },
  config?: { displayName?: string; teaser?: { humanExpression?: string } } | null,
): string[] {
  const arch = profile?.dominantArchetype ?? "Ignispectrum";
  const cfg = config ?? getArchetypePreviewConfig(arch);
  const displayName = cfg?.displayName ?? (typeof arch === "string" ? arch.toUpperCase() : "IGNISPECTRUM");
  const humanExpression = cfg?.teaser?.humanExpression;
  if (humanExpression && humanExpression !== "—") {
    const expr = humanExpression.trim();
    const article = /^\s*The\s/.test(expr) ? "" : "the ";
    return [`This identity operates as ${article}${expr} within the ${displayName} regime.`];
  }
  return [`This identity operates within the ${displayName} regime.`];
}

/** Returns 1–2 complete sentences. Does not repeat resolution or cosmic analogue. */
export function composeArchetypeSummary(profile: { dominantArchetype?: string }): string[] {
  const arch = profile?.dominantArchetype ?? "Ignispectrum";
  let phraseBank;
  try {
    phraseBank = getArchetypePhraseBank(arch as LigsArchetype);
  } catch {
    return [];
  }
  const behavioral = phraseBank?.behavioralTells?.[0];
  const relational = phraseBank?.relationalTells?.[0];
  const lines: string[] = [];
  if (hasContent(behavioral)) {
    const b = behavioral.trim().replace(/\.$/, "");
    lines.push(`In practice, you tend to ${b}.`);
  }
  if (hasContent(relational) && lines.length < 2) {
    const r = relational.trim().replace(/\.$/, "");
    const capped = r.charAt(0).toUpperCase() + r.slice(1);
    lines.push(capped.endsWith(".") ? capped : `${capped}.`);
  }
  return lines;
}

/** Returns 1–2 complete sentences. No generic fallback. */
export function composeLightExpression(profile: {
  light_signature?: { oracle?: string; custodian?: string };
  archetype?: { oracle?: string; custodian?: string };
  emotionalSnippet?: string;
}): string[] {
  const archSection = profile?.archetype;
  const ls = profile?.light_signature;
  const emotionalSnippet = profile?.emotionalSnippet;

  const candidates = [
    ls?.oracle,
    ls?.custodian,
    archSection?.oracle,
    archSection?.custodian,
    emotionalSnippet,
  ].filter(hasContent);

  for (const raw of candidates) {
    const cleaned = raw
      .replace(/^In practice,\s*/i, "")
      .replace(/^You tend to\s+/i, "")
      .trim();
    if (cleaned.length < 15) continue;
    const capped = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    const sentence = capped.endsWith(".") ? capped : `${capped}.`;
    if (sentence.length > 20) return [sentence];
  }
  return [];
}

/** Returns 1–2 complete sentences. Concept + archetype-specific anchor. Phenomenon appears only in TerminalResolutionSequence; here we use lightBehaviorKeywords for a non-repetitive anchor. */
export function composeCosmicTwin(profile: { dominantArchetype?: string }): string[] {
  const arch = profile?.dominantArchetype ?? "Ignispectrum";
  const cosmic = getCosmicAnalogue(arch as LigsArchetype);
  const keywords = cosmic?.lightBehaviorKeywords ?? [];

  const lines: string[] = [
    "Each identity maps to a cosmic analogue—the same light behavior expressed at a different scale.",
  ];

  if (keywords.length >= 2) {
    const anchor = `${keywords[0]} and ${keywords[1]}`
      .replace(/\bcollimated outflow\b/g, "directed outflow");
    lines.push(`For this regime, the analogue appears in patterns of ${anchor}.`);
  } else if (keywords.length === 1 && hasContent(keywords[0])) {
    const kw = keywords[0].replace(/\bcollimated outflow\b/g, "directed outflow");
    lines.push(`For this regime, the analogue appears in patterns of ${kw}.`);
  } else {
    lines.push("Subject and twin form a relational mirror.");
  }

  return lines;
}

/** Returns 1–2 complete sentences. Converts Key Moves lists into readable practice sentences. */
export function composeReturnToCoherence(profile: {
  fullReport?: string;
  corrective_vector?: { raw_signal?: string; oracle?: string };
  dominantArchetype?: string;
}): string[] {
  const keyMoves = parseKeyMoves(profile?.fullReport);
  const cv = profile?.corrective_vector;
  const arch = profile?.dominantArchetype ?? "Ignispectrum";

  if (keyMoves.length > 0) {
    const phrase = keyMovesToPracticePhrase(keyMoves);
    if (hasContent(phrase)) {
      return [`Coherence is supported by practices like ${phrase}.`];
    }
  }

  if (cv && (hasContent(cv.raw_signal) || hasContent(cv.oracle))) {
    const raw = (cv.raw_signal || cv.oracle || "").trim();
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      const phrase = parts.length > 1
        ? `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`
        : parts[0];
      if (hasContent(phrase)) {
        return [`A simple reset: ${phrase}.`];
      }
    }
  }

  let phraseBank;
  try {
    phraseBank = getArchetypePhraseBank(arch as LigsArchetype);
  } catch {
    return [];
  }
  const resetMove = phraseBank?.resetMoves?.[0];
  if (hasContent(resetMove)) {
    const phrase = keyMovesToPracticePhrase([resetMove]);
    if (hasContent(phrase)) {
      return [`Stabilization is supported by ${phrase}.`];
    }
  }
  return [];
}

/** Format canonical civilizational function entry as paid WHOIS CIVILIZATIONAL FUNCTION section body. */
export function composeCivilizationalFunctionSection(profile: {
  dominantArchetype?: string;
}): string {
  const arch = profile?.dominantArchetype?.trim();
  const archetype: LigsArchetype = arch && hasCivilizationalFunction(arch) ? (arch as LigsArchetype) : "Ignispectrum";
  const entry = getCivilizationalFunction(archetype);
  const parts: string[] = [
    "Every archetypal structure performs a role in the larger human system.",
    "The following describes where this pattern most naturally contributes.",
    "",
    "Structural Function",
    entry.structuralFunction,
    "",
    "Contribution Environments",
    ...entry.contributionEnvironments.map((e) => `• ${e}`),
    "",
    "Friction Environments",
    ...entry.frictionEnvironments.map((e) => `• ${e}`),
    "",
    "Civilizational Role",
    entry.civilizationalRole,
    "",
    "Integration Insight",
    entry.integrationInsight,
  ];
  return parts.join("\n");
}
