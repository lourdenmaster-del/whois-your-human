import type { VoiceProfile, LigsArchetype } from "../voice/schema";
import type { ImagePromptSpec } from "./schema";
import { getVisualParamsOrFallback } from "@/src/ligs/archetypes/adapters";
import { buildTriangulatedMarketingPrompt } from "@/lib/marketing/visuals";
import {
  getPrimaryArchetypeFromSolarLongitude,
  resolveSecondaryArchetype,
  buildTriangulatedImagePrompt,
} from "./triangulatePrompt";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";

export const NEGATIVE_EXCLUSIONS = [
  "text",
  "letters",
  "logo",
  "watermark",
  "signature",
  "face",
  "person",
  "figure",
  "silhouette",
  "astrology",
  "zodiac",
  "symbols",
  "busy texture",
  "high contrast",
];

const MATERIAL_ACCENTS = [
  "subtle grain",
  "soft sheen",
  "matte finish",
  "satin texture",
  "fine grain",
  "delicate weave",
  "organic grain",
  "gentle patina",
];

const LIGHTING_ANGLES = [
  "soft top-lit",
  "diffused side-light",
  "gentle backlight",
  "even ambient",
  "subtle rim light",
  "balanced key light",
  "soft fill",
  "natural diffusion",
];

const TEXTURE_GRAINS = [
  "minimal grain",
  "fine micro-texture",
  "subtle surface variation",
  "soft organic grain",
  "delicate texture",
  "barely perceptible grain",
  "smooth micro-detail",
  "gentle variation",
];

function simpleHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

function deterministicMotifs(
  profileId: string,
  purpose: string,
  variationKey: string
): string[] {
  const seed = simpleHash(profileId + purpose + variationKey);
  const motifs: string[] = [];
  const materialIdx = (seed % MATERIAL_ACCENTS.length + MATERIAL_ACCENTS.length) % MATERIAL_ACCENTS.length;
  const lightingIdx = ((seed >> 8) % LIGHTING_ANGLES.length + LIGHTING_ANGLES.length) % LIGHTING_ANGLES.length;
  const textureIdx = ((seed >> 16) % TEXTURE_GRAINS.length + TEXTURE_GRAINS.length) % TEXTURE_GRAINS.length;
  motifs.push(MATERIAL_ACCENTS[materialIdx]);
  motifs.push(LIGHTING_ANGLES[lightingIdx]);
  motifs.push(TEXTURE_GRAINS[textureIdx]);
  return motifs;
}

export interface SolarProfileInput {
  sunLonDeg: number;
  twilightPhase: "day" | "civil" | "nautical" | "astronomical" | "night";
}

export interface BuildImagePromptSpecOptions {
  purpose: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:5";
  size?: "1024" | "1536";
  count?: number;
  archetype?: LigsArchetype;
  variationKey?: string;
  /** Optional solar context for triangulated prompts. When absent, primary = secondary. */
  solarProfile?: SolarProfileInput;
  /** Twilight phase for triangulated marketing (default: nautical). */
  twilightPhase?: "day" | "civil" | "nautical" | "astronomical" | "night";
}

const MARKETING_PURPOSES = ["marketing_logo_mark", "marketing_background", "marketing_overlay", "share_card"] as const;
const TRIANGULATED_MARKETING_PURPOSES = ["marketing_logo_mark", "marketing_background", "marketing_overlay", "share_card"] as const;

function parseContrastDeltaFromVariationKey(variationKey: string): number {
  const m = variationKey.match(/cd([\d.]+)/i);
  if (m) {
    const n = parseFloat(m[1]);
    if (!Number.isNaN(n)) return Math.max(0, Math.min(1, n));
  }
  return 0.15;
}

/** For marketing: variationKey may be "raw_ArchetypeName_cd0.15" to pass unknown archetypes. */
function parseArchetypeFromVariationKey(
  variationKey: string,
  fallback: LigsArchetype
): string {
  const m = variationKey.match(/^raw_(.+?)(?:_cd[\d.]+)?$/i);
  if (m) return m[1].trim();
  return String(fallback);
}

export function buildImagePromptSpec(
  profile: VoiceProfile,
  options: BuildImagePromptSpecOptions
): ImagePromptSpec {
  const { purpose } = options;
  const arch = options.archetype ?? profile.ligs.primary_archetype;
  const variationKey = options.variationKey ?? "0";

  if (MARKETING_PURPOSES.includes(purpose as (typeof MARKETING_PURPOSES)[number])) {
    const contrastDelta = parseContrastDeltaFromVariationKey(variationKey);
    const archStr = parseArchetypeFromVariationKey(variationKey, arch as LigsArchetype);
    const archLigs = archStr as LigsArchetype;
    const twilightDefault = (purpose === "marketing_background" || purpose === "share_card") ? "day" : "nautical";
    const solarProfileOpt = options.solarProfile ?? {
      sunLonDeg: (LIGS_ARCHETYPES.indexOf(archLigs) >= 0
        ? LIGS_ARCHETYPES.indexOf(archLigs) * 30 + 15
        : 0) % 360,
      twilightPhase: (options.twilightPhase ?? twilightDefault) as "day" | "civil" | "nautical" | "astronomical" | "night",
    };
    const triangulated = buildTriangulatedMarketingPrompt(
      {
        primaryArchetype: archLigs,
        secondaryArchetype: profile.ligs.secondary_archetype,
        solarProfile: solarProfileOpt,
        twilightPhase: solarProfileOpt.twilightPhase,
        seed: `${profile.id}_${variationKey}`,
      },
      purpose as "marketing_logo_mark" | "marketing_background" | "marketing_overlay" | "share_card"
    );
    const positive = triangulated.positive;
    const negative = triangulated.negative;
    const visual = getVisualParamsOrFallback(archStr);
    return {
      id: `img_${profile.id}_${Date.now()}`,
      version: "1.0.0",
      created_at: new Date().toISOString(),
      ligs: {
        primary_archetype: arch as LigsArchetype,
        secondary_archetype: profile.ligs.secondary_archetype,
        blend_weights: profile.ligs.blend_weights ?? {},
      },
      purpose,
      style: visual,
      composition: {
        layout: visual.layout,
        symmetry: visual.symmetry,
        negative_space: visual.negative_space,
        focal_behavior: visual.focal_behavior,
        flow_lines: visual.flow_lines,
      },
      constraints: {
        no_text: true,
        no_logos: true,
        no_faces: true,
        no_figures: true,
        no_symbols: true,
        no_astrology: true,
        avoid_busy_textures: true,
        safety_notes: [],
      },
      output: {
        aspectRatio:
          purpose === "marketing_logo_mark"
            ? "1:1"
            : TRIANGULATED_MARKETING_PURPOSES.includes(purpose as (typeof TRIANGULATED_MARKETING_PURPOSES)[number])
              ? "16:9"
              : "1:1",
        size: options.size ?? "1024",
        count: 1,
      },
      prompt: { positive, negative },
      variation: {
        variationId: `var_${Date.now().toString(36)}`,
        motifs: [],
        randomnessLevel: 0.2,
      },
    };
  }

  const visual = getVisualParamsOrFallback(arch);
  const variationId = `var_${simpleHash(profile.id + purpose + variationKey).toString(36)}`;
  const motifs = deterministicMotifs(profile.id, purpose, variationKey);
  const seed = profile.id + purpose + variationKey;

  const archLigs = arch as LigsArchetype;
  const solarProfile = options.solarProfile ?? {
    sunLonDeg: (LIGS_ARCHETYPES.indexOf(archLigs) * 30 + 15) % 360,
    twilightPhase: "day" as const,
  };
  const primaryArchetype = options.solarProfile
    ? getPrimaryArchetypeFromSolarLongitude(options.solarProfile.sunLonDeg)
    : archLigs;
  const secondaryArchetype = resolveSecondaryArchetype(archLigs, primaryArchetype);

  const descriptorPhrases = profile.descriptors.slice(0, 3).join(", ");
  const triangulated = buildTriangulatedImagePrompt({
    primaryArchetype,
    secondaryArchetype,
    solarProfile,
    twilightPhase: solarProfile.twilightPhase,
    mode: "variation",
    seed,
    entropy: 0.2,
    basePrompt: descriptorPhrases
      ? `Abstract premium background. ${descriptorPhrases}. ${visual.mood}. ${motifs.join(". ")}.`
      : undefined,
  });

  const positive = triangulated.positive;
  const negative = triangulated.negative;

  return {
    id: `img_${profile.id}_${Date.now()}`,
    version: "1.0.0",
    created_at: new Date().toISOString(),

    ligs: {
      primary_archetype: arch,
      secondary_archetype: profile.ligs.secondary_archetype,
      blend_weights: profile.ligs.blend_weights ?? {},
    },

    purpose,

    style: {
      mood: visual.mood,
      palette: visual.palette,
      materials: visual.materials,
      lighting: visual.lighting,
      texture_level: visual.texture_level,
      contrast_level: visual.contrast_level,
    },

    composition: {
      layout: visual.layout,
      symmetry: visual.symmetry,
      negative_space: visual.negative_space,
      focal_behavior: visual.focal_behavior,
      flow_lines: visual.flow_lines,
    },

    constraints: {
      no_text: true,
      no_logos: true,
      no_faces: true,
      no_figures: true,
      no_symbols: true,
      no_astrology: true,
      avoid_busy_textures: true,
      safety_notes: [],
    },

    output: {
      aspectRatio: options.aspectRatio ?? "1:1",
      size: options.size ?? "1024",
      count: Math.min(4, Math.max(1, options.count ?? 1)),
    },

    prompt: {
      positive,
      negative,
    },

    variation: {
      variationId,
      motifs,
      randomnessLevel: 0.2,
    },
  };
}
