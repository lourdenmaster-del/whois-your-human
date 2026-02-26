/**
 * Compatibility adapters: return legacy shapes from the canonical archetype contract.
 * Use these when migrating consumers—each adapter returns the exact shape the legacy module expects.
 */

import { LIGS_ARCHETYPES, getArchetypeOrFallback } from "./contract";
import type { LigsArchetype } from "./contract";
import type { ArchetypeVisualParams } from "../image/archetype-visual-map";
import type { ArchetypeAnchor } from "../voice/prompt/archetypeAnchors";

/** Returns full visual map Record for all known archetypes (same shape as ARCHETYPE_VISUAL_MAP). */
export function getVisualMapRecord(): Record<LigsArchetype, ArchetypeVisualParams> {
  const out = {} as Record<LigsArchetype, ArchetypeVisualParams>;
  for (const arch of LIGS_ARCHETYPES) {
    out[arch] = getArchetypeVisualMapShape(arch);
  }
  return out;
}

/** Returns ArchetypeVisualParams for any archetype; unknown/empty use NEUTRAL_FALLBACK.visual. */
export function getVisualParamsOrFallback(
  archetype: string | undefined | null
): ArchetypeVisualParams {
  return getArchetypeVisualMapShape(archetype == null ? "" : String(archetype));
}

/** Returns ArchetypeVisualParams for one archetype (same shape as ARCHETYPE_VISUAL_MAP[archetype]). */
export function getArchetypeVisualMapShape(archetype: string): ArchetypeVisualParams {
  const c = getArchetypeOrFallback(archetype);
  return {
    mood: c.visual.mood,
    palette: [...c.visual.palette],
    materials: [...c.visual.materials],
    lighting: c.visual.lighting,
    texture_level: c.visual.texture_level,
    contrast_level: c.visual.contrast_level,
    layout: c.visual.layout,
    symmetry: c.visual.symmetry,
    negative_space: c.visual.negative_space,
    focal_behavior: c.visual.focal_behavior,
    flow_lines: c.visual.flow_lines,
    ...(c.visual.abstractPhysicalCues && { abstractPhysicalCues: c.visual.abstractPhysicalCues }),
  };
}

/** Returns ArchetypeAnchor for one archetype (same shape as ARCHETYPE_ANCHORS[archetype]). */
export function getArchetypeVoiceAnchorShape(archetype: string): ArchetypeAnchor {
  const c = getArchetypeOrFallback(archetype);
  return {
    emotional_temperature: c.voice.emotional_temperature,
    rhythm: c.voice.rhythm,
    lexicon_bias: [...c.voice.lexicon_bias],
    metaphor_density: c.voice.metaphor_density,
    assertiveness: c.voice.assertiveness,
    structure_preference: c.voice.structure_preference,
    notes: c.voice.notes,
  };
}

/** Returns full voice anchor Record for all known archetypes (same shape as ARCHETYPE_ANCHORS). */
export function getVoiceAnchorRecord(): Record<LigsArchetype, ArchetypeAnchor> {
  const out = {} as Record<LigsArchetype, ArchetypeAnchor>;
  for (const arch of LIGS_ARCHETYPES) {
    out[arch] = getArchetypeVoiceAnchorShape(arch);
  }
  return out;
}

/** Returns marketing descriptor base shape (same as lib/marketing/descriptor uses, without contrastDelta). */
export function getMarketingDescriptor(archetype: string): {
  archetypeLabel: string;
  tagline: string;
  hitPoints: string[];
  ctaText: string;
  ctaStyle: "soft" | "direct" | "premium" | "subtle";
} {
  const c = getArchetypeOrFallback(archetype);
  return {
    archetypeLabel: c.marketingDescriptor.archetypeLabel,
    tagline: c.marketingDescriptor.tagline,
    hitPoints: [...c.marketingDescriptor.hitPoints],
    ctaText: c.marketingDescriptor.ctaText,
    ctaStyle: c.marketingDescriptor.ctaStyle,
  };
}

/** Returns overlay copy bank (same shape as ARCHETYPE_COPY_PHRASES[archetype]). */
export function getOverlayCopyBank(archetype: string): {
  headlines: string[];
  subheads: string[];
  ctas: string[];
  disclaimers: string[];
} {
  const c = getArchetypeOrFallback(archetype);
  return {
    headlines: [...c.copyPhrases.headlines],
    subheads: [...c.copyPhrases.subheads],
    ctas: [...c.copyPhrases.ctas],
    disclaimers: [...c.copyPhrases.disclaimers],
  };
}

/** Returns full overlay copy Record for all known archetypes (same shape as ARCHETYPE_COPY_PHRASES). */
export function getOverlayCopyRecord(): Record<
  LigsArchetype,
  { headlines: string[]; subheads: string[]; ctas: string[]; disclaimers: string[] }
> {
  const out = {} as Record<
    LigsArchetype,
    { headlines: string[]; subheads: string[]; ctas: string[]; disclaimers: string[] }
  >;
  for (const arch of LIGS_ARCHETYPES) {
    out[arch] = getOverlayCopyBank(arch);
  }
  return out;
}

/** Returns marketing visuals (keywords, palette, motion) for lib/marketing/visuals.ts. */
export function getMarketingVisuals(archetype: string): {
  keywords: string[];
  palette: string[];
  motion: string;
} {
  const c = getArchetypeOrFallback(archetype);
  return {
    keywords: [...c.marketingVisuals.keywords],
    palette: [...c.marketingVisuals.palette],
    motion: c.marketingVisuals.motion,
  };
}
