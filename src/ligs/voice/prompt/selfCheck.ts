import type { VoiceProfile } from "../schema";
import { getArchetypeAnchor } from "./archetypeAnchors";

export interface SelfCheckItem {
  id: string;
  question: string;
  pass: boolean;
}

/**
 * Build a self-check rubric from a VoiceProfile.
 * Used as a quick checklist for the LLM before finalizing output.
 */
export function buildSelfCheckRubric(profile: VoiceProfile): string[] {
  const items: string[] = [];

  // Banned words
  if (profile.lexicon.banned_words.length > 0) {
    items.push(
      `[ ] No banned words used (${profile.lexicon.banned_words.join(", ")})`
    );
  }

  // Avoid words
  if (profile.lexicon.avoid_words.length > 0) {
    items.push(
      `[ ] No avoid words used (${profile.lexicon.avoid_words.slice(0, 8).join(", ")}${profile.lexicon.avoid_words.length > 8 ? "…" : ""})`
    );
  }

  // Claims policy
  if (profile.claims_policy.medical_claims === "prohibited") {
    items.push("[ ] No medical claims");
  }
  if (profile.claims_policy.before_after_promises === "prohibited") {
    items.push("[ ] No before/after promises");
  }
  if (profile.claims_policy.substantiation_required) {
    items.push(
      `[ ] Claims use allowed phrasing only (${profile.claims_policy.allowed_phrasing.join(", ") || "e.g. may help, supports"})`
    );
  }

  // Formatting
  if (profile.formatting.emoji_policy === "none") {
    items.push("[ ] No emoji");
  } else if (profile.formatting.emoji_policy === "rare") {
    items.push("[ ] Emoji used sparingly if at all");
  }
  if (profile.formatting.exclamation_policy === "none") {
    items.push("[ ] No exclamation marks");
  }

  // Cadence
  const [minW, maxW] = profile.cadence.sentence_length.range;
  items.push(
    `[ ] Sentence length within ${minW}–${maxW} words (target: ${profile.cadence.sentence_length.target_words})`
  );

  // Archetype alignment
  const anchor = getArchetypeAnchor(profile.ligs.primary_archetype);
  items.push(
    `[ ] Aligned with ${profile.ligs.primary_archetype}: ${anchor.rhythm}`
  );

  // Do/don't
  if (profile.examples.dont.length > 0) {
    items.push(
      `[ ] Avoid: ${profile.examples.dont.slice(0, 2).join("; ")}`
    );
  }

  return items;
}

/**
 * Format the rubric as a block for inclusion in prompts.
 */
export function formatSelfCheckBlock(profile: VoiceProfile): string {
  const items = buildSelfCheckRubric(profile);
  if (items.length === 0) return "";

  return [
    "## Self-check (before finalizing)",
    "",
    ...items.map((item) => `- ${item}`),
    "",
  ].join("\n");
}
