import type { VoiceProfile } from "../voice/schema";
import { getArchetypeAnchor } from "../voice/prompt/archetypeAnchors";

export interface OverlayPromptPack {
  systemVoiceBlock: string;
  taskBlock: string;
  hardConstraintsBlock: string;
}

export interface BuildOverlayPromptPackOptions {
  purpose: string;
  templateId: string;
  offer?: string;
  productName?: string;
}

/**
 * Build the prompt pack for overlay copy generation (headline, subhead, cta, disclaimer).
 * Used to generate copy in archetype voice, respecting profile claims policy and formatting.
 */
export function buildOverlayPromptPack(
  profile: VoiceProfile,
  options: BuildOverlayPromptPackOptions
): OverlayPromptPack {
  const { purpose, templateId, offer, productName } = options;
  const anchor = getArchetypeAnchor(profile.ligs.primary_archetype);

  const systemParts: string[] = [];
  systemParts.push(`# Brand Voice: ${profile.brand.name}`);
  systemParts.push("");
  systemParts.push("## Identity");
  systemParts.push(`- Archetype: ${profile.ligs.primary_archetype} (${anchor.notes})`);
  systemParts.push(`- Descriptors: ${profile.descriptors.join(", ")}`);
  systemParts.push(`- Lexicon bias: ${anchor.lexicon_bias.join(", ")}`);
  systemParts.push("");
  systemParts.push("## Formatting");
  systemParts.push(`- Emoji: ${profile.formatting.emoji_policy}`);
  systemParts.push(`- Exclamations: ${profile.formatting.exclamation_policy}`);
  systemParts.push(`- Headline style: ${profile.formatting.headline_style}`);
  if (profile.lexicon.banned_words.length > 0) {
    systemParts.push(`- NEVER use: ${profile.lexicon.banned_words.join(", ")}`);
  }
  if (profile.lexicon.avoid_words.length > 0) {
    systemParts.push(`- Avoid: ${profile.lexicon.avoid_words.join(", ")}`);
  }
  systemParts.push("");
  systemParts.push("## Constraints");
  if (profile.claims_policy.medical_claims === "prohibited") {
    systemParts.push("- NEVER make medical claims");
  }
  if (profile.claims_policy.before_after_promises === "prohibited") {
    systemParts.push("- NEVER promise before/after or guaranteed results");
  }

  const taskParts: string[] = [];
  taskParts.push(`# Task: Generate overlay copy`);
  taskParts.push("");
  taskParts.push(`- Purpose: ${purpose}`);
  taskParts.push(`- Template: ${templateId}`);
  if (productName) taskParts.push(`- Product: ${productName}`);
  if (offer) taskParts.push(`- Offer: ${offer}`);
  taskParts.push("");
  taskParts.push("Output ONLY valid JSON: { \"headline\": \"...\", \"subhead\": \"...\", \"cta\": \"...\" }");
  taskParts.push("- headline: max 60 chars, required");
  taskParts.push("- subhead: max 140 chars, optional");
  taskParts.push("- cta: max 24 chars, optional");

  const hardParts: string[] = [];
  hardParts.push("# Hard Constraints");
  if (profile.lexicon.banned_words.length > 0) {
    hardParts.push(`- NEVER: ${profile.lexicon.banned_words.join(", ")}`);
  }
  if (profile.formatting.emoji_policy === "none") {
    hardParts.push("- NEVER use emoji");
  }
  const dontExamples = profile.examples?.dont ?? [];
  if (dontExamples.length > 0) {
    dontExamples.forEach((d) => hardParts.push(`- NEVER: ${d}`));
  }

  return {
    systemVoiceBlock: systemParts.join("\n"),
    taskBlock: taskParts.join("\n"),
    hardConstraintsBlock: hardParts.join("\n"),
  };
}

/**
 * Combine pack blocks into a single system prompt string.
 */
export function toOverlaySystemPrompt(pack: OverlayPromptPack): string {
  return [pack.systemVoiceBlock, pack.hardConstraintsBlock, pack.taskBlock]
    .filter(Boolean)
    .join("\n\n---\n\n");
}
