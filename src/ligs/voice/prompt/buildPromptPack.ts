import type { VoiceProfile, Channel } from "../schema";
import { getArchetypeAnchor } from "./archetypeAnchors";
import { formatSelfCheckBlock } from "./selfCheck";

export interface PromptPack {
  systemVoiceBlock: string;
  channelAdapterBlock: string;
  hardConstraintsBlock: string;
  selfCheckBlock: string;
}

/**
 * Build the stable system voice block (identity + descriptors + cadence + archetype).
 */
function buildSystemVoiceBlock(profile: VoiceProfile): string {
  const anchor = getArchetypeAnchor(profile.ligs.primary_archetype);
  const parts: string[] = [];

  parts.push(`# Brand Voice: ${profile.brand.name}`);
  parts.push("");
  parts.push("## Identity");
  parts.push(`- Archetype: ${profile.ligs.primary_archetype} (${anchor.notes})`);
  parts.push(`- Descriptors: ${profile.descriptors.join(", ")}`);
  parts.push("");

  parts.push("## Cadence");
  const [minW, maxW] = profile.cadence.sentence_length.range;
  parts.push(
    `- Sentences: ${profile.cadence.sentence_length.target_words} words target (range ${minW}–${maxW})`
  );
  const [minS, maxS] = profile.cadence.paragraph_length.range;
  parts.push(
    `- Paragraphs: ${profile.cadence.paragraph_length.target_sentences} sentences target (range ${minS}–${maxS})`
  );
  if (profile.cadence.rhythm_notes) {
    parts.push(`- Rhythm: ${profile.cadence.rhythm_notes}`);
  }
  parts.push("");

  parts.push("## Lexicon");
  if (profile.lexicon.preferred_words.length > 0) {
    parts.push(`- Prefer: ${profile.lexicon.preferred_words.join(", ")}`);
  }
  if (profile.lexicon.avoid_words.length > 0) {
    parts.push(`- Avoid: ${profile.lexicon.avoid_words.join(", ")}`);
  }
  if (profile.lexicon.banned_words.length > 0) {
    parts.push(`- Never: ${profile.lexicon.banned_words.join(", ")}`);
  }

  return parts.join("\n");
}

/**
 * Build the channel adapter block (tone shift + structure for the channel).
 */
function buildChannelAdapterBlock(
  profile: VoiceProfile,
  channel: Channel | null
): string {
  if (!channel) return "";

  const adapter = profile.channel_adapters?.[channel];
  if (!adapter || (!adapter.tone_shift && adapter.structure.length === 0)) {
    return "";
  }

  const parts: string[] = [];
  parts.push(`# Channel: ${channel}`);
  parts.push("");
  if (adapter.tone_shift) {
    parts.push(`- Tone shift: ${adapter.tone_shift}`);
  }
  if (adapter.structure.length > 0) {
    parts.push(`- Structure: ${adapter.structure.join(" → ")}`);
  }
  return parts.join("\n");
}

/**
 * Build the hard constraints block (never do X).
 */
function buildHardConstraintsBlock(profile: VoiceProfile): string {
  const parts: string[] = [];
  parts.push("# Hard Constraints");
  parts.push("");

  if (profile.lexicon.banned_words.length > 0) {
    parts.push(
      `- NEVER use these words: ${profile.lexicon.banned_words.join(", ")}`
    );
  }
  if (profile.claims_policy.medical_claims === "prohibited") {
    parts.push("- NEVER make medical claims (e.g. cure, treat, heal)");
  }
  if (profile.claims_policy.before_after_promises === "prohibited") {
    parts.push("- NEVER promise before/after transformations");
  }
  if (profile.formatting.emoji_policy === "none") {
    parts.push("- NEVER use emoji");
  }
  if (profile.examples.dont.length > 0) {
    profile.examples.dont.forEach((d) => parts.push(`- NEVER: ${d}`));
  }

  return parts.join("\n");
}

/**
 * Build the full LLM prompt pack from a VoiceProfile.
 */
export function buildPromptPack(
  profile: VoiceProfile,
  options?: { channel?: Channel | null }
): PromptPack {
  const channel = options?.channel ?? null;

  return {
    systemVoiceBlock: buildSystemVoiceBlock(profile),
    channelAdapterBlock: buildChannelAdapterBlock(profile, channel),
    hardConstraintsBlock: buildHardConstraintsBlock(profile),
    selfCheckBlock: formatSelfCheckBlock(profile),
  };
}

/**
 * Combine all blocks into a single system prompt string.
 */
export function toSystemPrompt(pack: PromptPack): string {
  const blocks: string[] = [
    pack.systemVoiceBlock,
    pack.hardConstraintsBlock,
    pack.selfCheckBlock,
  ];
  if (pack.channelAdapterBlock) {
    blocks.splice(1, 0, pack.channelAdapterBlock);
  }
  return blocks.filter(Boolean).join("\n\n---\n\n");
}
