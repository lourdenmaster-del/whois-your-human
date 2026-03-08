import type { VoiceProfile, LigsArchetype } from "../voice/schema";
import type { MarketingOverlaySpec } from "./schema";
import { getTemplate } from "./templates";
import { hasArchetypeStaticImage } from "@/lib/archetype-static-images";
import { buildOverlayPromptPack, toOverlaySystemPrompt } from "./buildOverlayPromptPack";
import { getDefaultOverlayCopy } from "@/lib/marketing/defaultOverlayCopy";

/** Logo style tokens per archetype. Calm archetypes: subtle; bold: heavier; luminous: glow. */
function getLogoStyleForArchetype(arch: LigsArchetype): NonNullable<MarketingOverlaySpec["styleTokens"]>["logoStyle"] {
  const base = {
    text: "(L)" as const,
    fill: "#ffffff" as const,
    weight: "600" as const,
    tracking: 0,
    opacity: 0.95,
    blur: 0,
    glow: 1,
    radius: 0.48,
    strokeWidth: 0,
    circleFill: "rgba(0,0,0,0.7)",
    circleStroke: "rgba(255,255,255,0.3)",
  };
  switch (arch) {
    case "Stabiliora":
      return { ...base, weight: "600", tracking: 0, opacity: 0.92, blur: 0, glow: 0, radius: 0.48, circleFill: "rgba(0,0,0,0.65)", circleStroke: "rgba(255,255,255,0.25)" };
    case "Ignispectrum":
      return { ...base, weight: "700", tracking: 0.02, opacity: 1, blur: 0, glow: 4, radius: 0.48, circleFill: "rgba(60,20,10,0.8)", circleStroke: "rgba(255,180,80,0.5)" };
    case "Radiantis":
      return { ...base, weight: "600", tracking: 0, opacity: 1, blur: 0, glow: 6, radius: 0.48, circleFill: "rgba(20,30,50,0.75)", circleStroke: "rgba(200,220,255,0.4)" };
    case "Tenebris":
      return { ...base, weight: "700", tracking: -0.02, opacity: 0.95, blur: 0, glow: 0, radius: 0.48, circleFill: "rgba(0,0,0,0.85)", circleStroke: "rgba(255,255,255,0.15)" };
    case "Precisura":
      return { ...base, weight: "600", tracking: 0.04, opacity: 1, blur: 0, glow: 0, radius: 0.48, stroke: "rgba(255,255,255,0.5)", strokeWidth: 0.5 };
    default:
      return { ...base, weight: "600", tracking: 0, opacity: 0.95, blur: 0, glow: 1, radius: 0.48 };
  }
}

function simpleHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3).trim() + "...";
}

/**
 * Robust JSON extraction from LLM response (may include markdown code blocks).
 */
function extractJsonCopy(text: string): { headline: string; subhead?: string; cta?: string } | null {
  const stripped = text
    .replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, "$1")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  try {
    const parsed = JSON.parse(stripped);
    if (typeof parsed.headline === "string" && parsed.headline.length > 0) {
      return {
        headline: truncate(String(parsed.headline), 60),
        subhead: parsed.subhead ? truncate(String(parsed.subhead), 140) : undefined,
        cta: parsed.cta ? truncate(String(parsed.cta), 24) : undefined,
      };
    }
  } catch {
    // fall through to null
  }
  return null;
}

/** Deterministic copy from marketingDescriptor (archetypeLabel, tagline, ctaText). */
function generateCopyDeterministic(
  profile: VoiceProfile,
  _purpose: string,
  _variationKey: string
): { headline: string; subhead?: string; cta?: string } {
  const arch = profile.ligs.primary_archetype;
  return getDefaultOverlayCopy(arch);
}

async function generateCopyViaLLM(
  profile: VoiceProfile,
  purpose: string,
  variationKey: string
): Promise<{ headline: string; subhead?: string; cta?: string }> {
  const pack = buildOverlayPromptPack(profile, {
    purpose,
    templateId: "square_card_v1",
  });
  const system = toOverlaySystemPrompt(pack);
  const user = `Generate marketing overlay copy for purpose: ${purpose}. Return JSON with headline (max 60 chars), subhead (max 140 chars, optional), cta (max 24 chars, optional). Use calm premium tone for Stabiliora. No hype.`;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return generateCopyDeterministic(profile, purpose, variationKey);
  }

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    max_tokens: 256,
  });

  const text = res.choices[0]?.message?.content?.trim();
  if (!text) return generateCopyDeterministic(profile, purpose, variationKey);

  const parsed = extractJsonCopy(text);
  if (parsed) return parsed;

  return generateCopyDeterministic(profile, purpose, variationKey);
}

export interface GenerateOverlaySpecOptions {
  templateId?: "square_card_v1";
  size?: "1024" | "1536";
  purpose: string;
  variationKey?: string;
  allowExternalWrites?: boolean;
}

export interface BuildOverlaySpecWithCopyOptions {
  templateId?: "square_card_v1";
  size?: "1024" | "1536";
  purpose: string;
  variationKey?: string;
}

/**
 * Build MarketingOverlaySpec synchronously. Copy defaults to marketingDescriptor
 * (archetypeLabel, tagline, ctaText) when missing or empty.
 * Used for DRY RUN compose preview in LIGS Studio.
 */
export function buildOverlaySpecWithCopy(
  profile: VoiceProfile,
  options: BuildOverlaySpecWithCopyOptions,
  copy?: { headline?: string; subhead?: string; cta?: string },
  archetype?: string
): MarketingOverlaySpec {
  const {
    templateId = "square_card_v1",
    size = "1024",
    purpose,
    variationKey = "0",
  } = options;

  const arch = (archetype ?? profile.ligs.primary_archetype) as LigsArchetype;
  const placement = getTemplate(templateId, "1:1");
  const defaultCopy = getDefaultOverlayCopy(arch);

  const finalHeadline = (copy?.headline?.trim() || defaultCopy.headline).slice(0, 60);
  const finalSubhead = (copy?.subhead?.trim() || defaultCopy.subhead)?.slice(0, 140);
  const finalCta = (copy?.cta?.trim() || defaultCopy.cta)?.slice(0, 24);

  const emojiPolicy = profile.formatting.emoji_policy === "none" ? "none" : "rare";
  const exclamationPolicy = profile.formatting.exclamation_policy === "none" ? "none" : "rare";
  const isStabiliora = arch === "Stabiliora";
  const spacing = isStabiliora ? (simpleHash(profile.id + purpose + variationKey + "spacing") % 2 === 0 ? "balanced" : "airy") : "balanced";

  return {
    id: `overlay_dry_${profile.id}_${Date.now()}`,
    version: "1.0.0",
    created_at: new Date().toISOString(),

    templateId,

    output: { aspectRatio: "1:1", size },

    copy: {
      headline: finalHeadline,
      subhead: finalSubhead,
      cta: finalCta,
    },

    placement: {
      safeArea: placement.safeArea,
      logo: placement.logo,
      textBlock: placement.textBlock,
      ctaChip: placement.ctaChip,
    },

    styleTokens: {
      spacing,
      emojiPolicy,
      exclamationPolicy,
      typography: {
        headlineSize: "lg",
        subheadSize: "sm",
        weight: "regular",
      },
      logoStyle: getLogoStyleForArchetype(arch),
    },

    constraints: {
      bannedWords: profile.lexicon.banned_words ?? [],
      noMedicalClaims: profile.claims_policy.medical_claims === "prohibited",
      noGuarantees: profile.claims_policy.before_after_promises === "prohibited",
    },

    markType: hasArchetypeStaticImage(arch) ? ("archetype" as const) : ("brand" as const),
    markArchetype: hasArchetypeStaticImage(arch) ? arch : undefined,
  };
}

/**
 * Generate MarketingOverlaySpec from VoiceProfile.
 * - Placement: STATIC from templates (never model-controlled)
 * - Copy: LLM-generated when allowExternalWrites; else deterministic fallback
 * - styleTokens: derived from profile + archetype (Stabiliora: balanced/airy, emoji none, exclamation rare/none)
 */
export async function generateOverlaySpec(
  profile: VoiceProfile,
  options: GenerateOverlaySpecOptions
): Promise<MarketingOverlaySpec> {
  const {
    templateId = "square_card_v1",
    size = "1024",
    purpose,
    variationKey = "0",
    allowExternalWrites = false,
  } = options;

  const arch = profile.ligs.primary_archetype;
  const placement = getTemplate(templateId, "1:1");

  const copy =
    allowExternalWrites && process.env.ALLOW_EXTERNAL_WRITES === "true"
      ? await generateCopyViaLLM(profile, purpose, variationKey)
      : generateCopyDeterministic(profile, purpose, variationKey);

  const emojiPolicy = profile.formatting.emoji_policy === "none" ? "none" : "rare";
  const exclamationPolicy = profile.formatting.exclamation_policy === "none" ? "none" : "rare";
  const isStabiliora = arch === "Stabiliora";
  const spacing = isStabiliora ? (simpleHash(profile.id + "spacing") % 2 === 0 ? "balanced" : "airy") : "balanced";

  return {
    id: `overlay_${profile.id}_${Date.now()}`,
    version: "1.0.0",
    created_at: new Date().toISOString(),

    templateId,

    output: { aspectRatio: "1:1", size },

    copy,

    placement: {
      safeArea: placement.safeArea,
      logo: placement.logo,
      textBlock: placement.textBlock,
      ctaChip: placement.ctaChip,
    },

    styleTokens: {
      spacing,
      emojiPolicy,
      exclamationPolicy,
      typography: {
        headlineSize: "lg",
        subheadSize: "sm",
        weight: "regular",
      },
      logoStyle: getLogoStyleForArchetype(arch),
    },

    constraints: {
      bannedWords: profile.lexicon.banned_words ?? [],
      noMedicalClaims: profile.claims_policy.medical_claims === "prohibited",
      noGuarantees: profile.claims_policy.before_after_promises === "prohibited",
    },

    markType: hasArchetypeStaticImage(arch) ? ("archetype" as const) : ("brand" as const),
    markArchetype: hasArchetypeStaticImage(arch) ? arch : undefined,
  };
}
