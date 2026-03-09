/**
 * Single source of truth for LIGS archetype data.
 * Canonical contract: voice, visual, marketingDescriptor, marketingVisuals, copyPhrases.
 */

import type { LigsArchetype } from "../voice/schema";

// Re-export for consumers who want archetype from contract
export type { LigsArchetype };

/** Voice/tone for LLM and copy generation */
export interface ArchetypeVoice {
  emotional_temperature: "low" | "medium" | "high";
  rhythm: string;
  lexicon_bias: string[];
  metaphor_density: "low" | "medium" | "high";
  assertiveness: "low" | "medium" | "high";
  structure_preference: "lists" | "declarative" | "narrative" | "mixed";
  notes: string;
}

/** Image generation style */
export interface ArchetypeVisual {
  mood: string;
  palette: string[];
  materials: string[];
  lighting: string;
  texture_level: "low" | "medium" | "high";
  contrast_level: "low" | "medium" | "high";
  layout: string;
  symmetry: "low" | "medium" | "high";
  negative_space: "low" | "medium" | "high";
  focal_behavior: string;
  flow_lines: "none" | "subtle" | "present";
  /** Optional abstract physical cues for marketing modes (no literal objects). */
  abstractPhysicalCues?: string;
}

/** Marketing descriptor (label, tagline, hit points, CTA) */
export interface ArchetypeMarketingDescriptor {
  archetypeLabel: string;
  tagline: string;
  hitPoints: string[];
  ctaText: string;
  ctaStyle: "soft" | "direct" | "premium" | "subtle";
}

/** Marketing visuals keywords + palette + motion */
export interface ArchetypeMarketingVisuals {
  keywords: string[];
  palette: string[];
  motion: string;
}

/** Overlay copy phrase banks */
export interface ArchetypeCopyPhrases {
  headlines: string[];
  subheads: string[];
  ctas: string[];
  disclaimers: string[];
}

/** Canonical descriptive layer for preview/report UI. Human-readable summary lines. */
export interface ArchetypePreviewDescriptor {
  humanExpression: string;
  civilizationFunction: string;
  archetypalVoice: string;
  environments: string[];
}

export interface ArchetypeContract {
  voice: ArchetypeVoice;
  visual: ArchetypeVisual;
  marketingDescriptor: ArchetypeMarketingDescriptor;
  marketingVisuals: ArchetypeMarketingVisuals;
  copyPhrases: ArchetypeCopyPhrases;
  preview: ArchetypePreviewDescriptor;
}

/** Canonical 12 archetypes for iteration */
/**
 * Fallback when engine output is missing. Used by API routes, minimal-profile, etc.
 * Imagery source of truth: engine output (primaryArchetype, secondaryArchetype, voiceProfile) > this fallback.
 */
export const FALLBACK_PRIMARY_ARCHETYPE: LigsArchetype = "Stabiliora";

export const LIGS_ARCHETYPES: readonly LigsArchetype[] = [
  "Ignispectrum",
  "Stabiliora",
  "Duplicaris",
  "Tenebris",
  "Radiantis",
  "Precisura",
  "Aequilibris",
  "Obscurion",
  "Vectoris",
  "Structoris",
  "Innovaris",
  "Fluxionis",
] as const;

/** Neutral fallback for unknown archetypes. Not tied to any named archetype. */
export const NEUTRAL_FALLBACK: ArchetypeContract = {
  voice: {
    emotional_temperature: "medium",
    rhythm: "balanced, clear, measured",
    lexicon_bias: ["premium", "minimal", "refined"],
    metaphor_density: "low",
    assertiveness: "low",
    structure_preference: "declarative",
    notes: "Neutral, premium, minimal; no hype; clear and measured.",
  },
  visual: {
    mood: "premium, minimal, refined",
    palette: ["neutral", "cream", "warm gray", "ivory"],
    materials: ["minimal", "clean"],
    lighting: "soft, even",
    texture_level: "low",
    contrast_level: "low",
    layout: "centered, balanced",
    symmetry: "medium",
    negative_space: "high",
    focal_behavior: "single point, gentle",
    flow_lines: "subtle",
  },
  marketingDescriptor: {
    archetypeLabel: "Neutral",
    tagline: "Premium. Minimal. Refined.",
    hitPoints: [
      "Premium, minimal tone",
      "Clear and measured",
      "No hype, just clarity",
    ],
    ctaText: "Learn more",
    ctaStyle: "soft",
  },
  marketingVisuals: {
    keywords: ["premium", "minimal", "refined"],
    palette: ["neutral", "cream", "warm gray", "ivory"],
    motion: "soft, gentle flow",
  },
  copyPhrases: {
    headlines: ["Premium clarity", "Minimal. Refined."],
    subheads: ["A measured approach."],
    ctas: ["Learn more", "Explore", "Discover"],
    disclaimers: ["Individual results may vary."],
  },
  preview: {
    humanExpression: "—",
    civilizationFunction: "—",
    archetypalVoice: "—",
    environments: ["—"],
  },
};

/** Type for the canonical archetype → contract map */
export type ArchetypeContractMap = Record<LigsArchetype, ArchetypeContract>;

/** Full contract map for known archetypes */
export const ARCHETYPE_CONTRACT_MAP: ArchetypeContractMap = {
  Stabiliora: {
    voice: {
      emotional_temperature: "low",
      rhythm: "smooth transitions, balanced clauses, minimal exclamations",
      lexicon_bias: ["balance", "restore", "steady", "coherent", "regulated"],
      metaphor_density: "low",
      assertiveness: "low",
      structure_preference: "declarative",
      notes: "regulated, calm, coherent; minimal hype, no chaotic intensity; balanced qualifiers, gentle certainty; symmetry, clarity.",
    },
    visual: {
      mood: "calm, regulated, coherent",
      palette: ["warm-neutral", "soft earth tones", "muted", "soft neutrals"],
      materials: ["organic", "natural", "minimal"],
      lighting: "soft, even, diffused",
      texture_level: "low",
      contrast_level: "low",
      layout: "centered, balanced",
      symmetry: "high",
      negative_space: "high",
      focal_behavior: "single point, gentle",
      flow_lines: "subtle",
      abstractPhysicalCues: "soft horizontal equilibrium, gentle diffusion, muted warmth gradient, stable field lines",
    },
    marketingDescriptor: {
      archetypeLabel: "Stabiliora",
      tagline: "Restore balance. Stay coherent.",
      hitPoints: [
        "Calm, regulated tone without hype",
        "Balanced structure and symmetry",
        "Gentle certainty, minimal intensity",
        "Clarity through measured language",
      ],
      ctaText: "Restore balance",
      ctaStyle: "soft",
    },
    marketingVisuals: {
      keywords: ["balance", "coherence", "regulation"],
      palette: ["blush", "cream", "rosewater", "lavender"],
      motion: "symmetrical flow lines",
    },
    copyPhrases: {
      headlines: [
        "Find your balance",
        "Steady, clear, calm",
        "Restore your rhythm",
        "Coherent and regulated",
        "Gentle certainty",
      ],
      subheads: [
        "A measured approach to what matters most.",
        "Simple steps toward lasting calm.",
        "No hype, just clarity.",
      ],
      ctas: ["Learn more", "Discover", "Explore"],
      disclaimers: [
        "Individual results may vary.",
        "For informational purposes only.",
      ],
    },
    preview: {
      humanExpression: "The Anchor",
      civilizationFunction: "Keeps society from collapsing",
      archetypalVoice: "steady, grounded, measured lines",
      environments: ["System maintainers", "Institution builders", "Long-term planners"],
    },
  },
  Ignispectrum: {
    voice: {
      emotional_temperature: "high",
      rhythm: "energetic, dynamic, emphatic",
      lexicon_bias: ["energy", "transform", "ignite", "vivid", "intensity"],
      metaphor_density: "high",
      assertiveness: "high",
      structure_preference: "narrative",
      notes: "Fiery, transformative, vivid; high metaphor use; bold declarations.",
    },
    visual: {
      mood: "energetic, vivid, transformative",
      palette: ["warm", "fiery", "intense hues"],
      materials: ["dynamic", "fluid"],
      lighting: "dramatic, high contrast",
      texture_level: "medium",
      contrast_level: "high",
      layout: "dynamic, diagonal",
      symmetry: "low",
      negative_space: "medium",
      focal_behavior: "flowing, directional",
      flow_lines: "present",
      abstractPhysicalCues: "white-hot core gradient, directional energy shear, prismatic heat haze",
    },
    marketingDescriptor: {
      archetypeLabel: "Ignispectrum",
      tagline: "Transform with intensity.",
      hitPoints: [
        "Energetic, vivid expression",
        "Bold declarations and momentum",
        "High metaphor density",
        "Dynamic, forward-moving narrative",
      ],
      ctaText: "Ignite change",
      ctaStyle: "direct",
    },
    marketingVisuals: {
      keywords: ["energy", "transform", "vivid", "intensity"],
      palette: ["warm", "fiery", "ember", "amber"],
      motion: "flowing, directional",
    },
    copyPhrases: {
      headlines: [
        "Ignite your transformation",
        "Vivid energy, real change",
        "Transform with intensity",
      ],
      subheads: [
        "Dynamic, bold, and unapologetically vivid.",
        "Where energy meets purpose.",
      ],
      ctas: ["Transform now", "Get started", "Ignite"],
      disclaimers: ["Results vary. Individual experience may differ."],
    },
    preview: {
      humanExpression: "The Initiator",
      civilizationFunction: "Drives the beginning of everything",
      archetypalVoice: "catalytic bursts, forward-pushing, high-energy phrasing",
      environments: ["Founders", "Explorers", "Innovators"],
    },
  },
  Duplicaris: {
    voice: {
      emotional_temperature: "medium",
      rhythm: "mirroring, reflective, balanced pairs",
      lexicon_bias: ["mirror", "reflect", "pair", "twin", "parallel"],
      metaphor_density: "medium",
      assertiveness: "medium",
      structure_preference: "mixed",
      notes: "Reflective, dualistic; balanced pairs; symmetrical phrasing.",
    },
    visual: {
      mood: "reflective, mirrored, dualistic",
      palette: ["neutral", "balanced pairs"],
      materials: ["symmetrical", "reflective"],
      lighting: "even, balanced",
      texture_level: "low",
      contrast_level: "medium",
      layout: "mirror, symmetrical",
      symmetry: "high",
      negative_space: "high",
      focal_behavior: "distributed, twin",
      flow_lines: "subtle",
      abstractPhysicalCues: "mirrored symmetry, reflective equilibrium, balanced twin gradients, parallel field lines",
    },
    marketingDescriptor: {
      archetypeLabel: "Duplicaris",
      tagline: "Reflect. Mirror. Align.",
      hitPoints: [
        "Reflective, dualistic perspective",
        "Balanced pairs and symmetry",
        "Mirroring structure",
        "Parallel, harmonious flow",
      ],
      ctaText: "See your reflection",
      ctaStyle: "soft",
    },
    marketingVisuals: {
      keywords: ["mirror", "reflect", "pair", "balance"],
      palette: ["neutral", "silver", "pearl", "ivory"],
      motion: "mirror, symmetrical flow",
    },
    copyPhrases: {
      headlines: ["Mirror your best", "Reflect and align", "Two sides, one goal"],
      subheads: ["Balanced pairs. Harmonious results."],
      ctas: ["See both sides", "Explore", "Reflect"],
      disclaimers: ["Individual results may vary."],
    },
    preview: {
      humanExpression: "The Mirror",
      civilizationFunction: "Creates social coherence",
      archetypalVoice: "attuned, reflective, synchronizing language",
      environments: ["Pattern multipliers", "Template users", "Scale operators"],
    },
  },
  Tenebris: {
    voice: {
      emotional_temperature: "low",
      rhythm: "subtle, measured, contemplative",
      lexicon_bias: ["shadow", "depth", "mystery", "quiet", "rest"],
      metaphor_density: "high",
      assertiveness: "low",
      structure_preference: "narrative",
      notes: "Dark, contemplative, subtle; metaphorical; quiet certainty. Avoid spooky, scary, horror, occult.",
    },
    visual: {
      mood: "quiet, deep, restrained, nocturne",
      palette: ["deep charcoal", "ink", "midnight", "cool neutrals"],
      materials: ["layered", "nuanced", "premium"],
      lighting: "low-key, soft falloff, subtle edge light",
      texture_level: "medium",
      contrast_level: "medium",
      layout: "centered, intimate",
      symmetry: "high",
      negative_space: "high",
      focal_behavior: "single point, quiet",
      flow_lines: "none",
      abstractPhysicalCues: "soft depth gradient, gentle edge falloff, restrained luminosity, premium nocturne field",
    },
    marketingDescriptor: {
      archetypeLabel: "Tenebris",
      tagline: "Depth in the quiet.",
      hitPoints: [
        "Contemplative, subtle tone",
        "Layered metaphor and nuance",
        "Low-key certainty",
        "Space for interpretation",
      ],
      ctaText: "Explore depth",
      ctaStyle: "subtle",
    },
    marketingVisuals: {
      keywords: ["shadow", "depth", "mystery", "quiet"],
      palette: ["deep", "shadow", "charcoal", "muted"],
      motion: "subtle, contemplative",
    },
    copyPhrases: {
      headlines: ["Depth in the quiet", "Subtle clarity", "Contemplative calm"],
      subheads: ["Quiet certainty. Restored focus."],
      ctas: ["Discover", "Explore depth", "Learn more"],
      disclaimers: ["For informational purposes."],
    },
    preview: {
      humanExpression: "The Depth Diver",
      civilizationFunction: "Expands depth and understanding",
      archetypalVoice: "deep, slow, layered sentences",
      environments: ["Night workers", "Depth seekers", "Shadow integrators"],
    },
  },
  Radiantis: {
    voice: {
      emotional_temperature: "high",
      rhythm: "luminous, expansive, flowing",
      lexicon_bias: ["light", "illuminate", "radiance", "clarity", "bright"],
      metaphor_density: "medium",
      assertiveness: "medium",
      structure_preference: "declarative",
      notes: "Luminous, illuminating; clarity and warmth; expansive tone. Avoid neon, sci-fi, lens flares, glitter, cheesy stock vibes.",
    },
    visual: {
      mood: "luminous, clear, uplifting, clean energy",
      palette: ["bright warm whites", "sunlit gold", "soft apricot", "airy pastels"],
      materials: ["translucent", "premium diffusion", "light-catching"],
      lighting: "high-key, soft bloom, clean highlights",
      texture_level: "low",
      contrast_level: "medium",
      layout: "expansive, open",
      symmetry: "high",
      negative_space: "high",
      focal_behavior: "radiating, central",
      flow_lines: "present",
      abstractPhysicalCues: "soft radiant gradient, gentle bloom diffusion, clean highlight field, premium luminous atmosphere",
    },
    marketingDescriptor: {
      archetypeLabel: "Radiantis",
      tagline: "Illuminate. Expand. Clarify.",
      hitPoints: [
        "Luminous, warm expression",
        "Clarity and openness",
        "Radiating, central focus",
        "Expansive yet precise",
      ],
      ctaText: "Discover clarity",
      ctaStyle: "premium",
    },
    marketingVisuals: {
      keywords: ["light", "illuminate", "clarity", "radiance"],
      palette: ["light", "bright", "warm whites", "cream"],
      motion: "radiating, central flow",
    },
    copyPhrases: {
      headlines: [
        "Illuminate your path",
        "Clarity and warmth",
        "Bright possibilities",
      ],
      subheads: ["Light on what matters. Expansive and clear."],
      ctas: ["Illuminate", "Discover", "Explore"],
      disclaimers: ["Individual results may vary."],
    },
    preview: {
      humanExpression: "The Amplifier",
      civilizationFunction: "Spreads ideas and culture",
      archetypalVoice: "bright, connective, outward-facing language",
      environments: ["Beacon holders", "Light amplifiers", "Inspiration carriers"],
    },
  },
  Precisura: {
    voice: {
      emotional_temperature: "low",
      rhythm: "crisp, concise, exact",
      lexicon_bias: ["precise", "exact", "measured", "specific", "accurate"],
      metaphor_density: "low",
      assertiveness: "medium",
      structure_preference: "lists",
      notes: "Precise, technical, measured; minimal flourish; structured. Avoid messy gradients, painterly chaos, tech HUD UI.",
    },
    visual: {
      mood: "crisp, exact, clean, surgical clarity",
      palette: ["cool whites", "graphite", "muted steel", "subtle violet accent"],
      materials: ["minimal", "ultra-clean", "premium"],
      lighting: "clear, controlled, sharp edge definition",
      texture_level: "low",
      contrast_level: "medium",
      layout: "grid-aligned, geometric, high order",
      symmetry: "high",
      negative_space: "high",
      focal_behavior: "single point, clear",
      flow_lines: "none",
      abstractPhysicalCues: "sharp geometric field, controlled edge definition, clean grid equilibrium, premium surgical clarity",
    },
    marketingDescriptor: {
      archetypeLabel: "Precisura",
      tagline: "Exact. Measured. Specific.",
      hitPoints: [
        "Crisp, technical tone",
        "Minimal flourish, maximum clarity",
        "Structured, rule-based flow",
        "Accurate and measured",
      ],
      ctaText: "Get precise",
      ctaStyle: "direct",
    },
    marketingVisuals: {
      keywords: ["precise", "exact", "measured", "clear"],
      palette: ["cool whites", "graphite", "muted steel", "subtle accent"],
      motion: "controlled, grid-aligned",
    },
    copyPhrases: {
      headlines: [
        "Exact. Measured. Clear.",
        "Precise steps forward",
        "Specific results",
      ],
      subheads: ["No guesswork. Structured progress."],
      ctas: ["Get precise", "Learn more", "Explore"],
      disclaimers: ["Accuracy depends on individual circumstances."],
    },
    preview: {
      humanExpression: "The Specialist",
      civilizationFunction: "Advances precision and mastery",
      archetypalVoice: "precise, refined, detail-oriented phrasing",
      environments: ["Detail specialists", "Boundary definers", "Measurement experts"],
    },
  },
  Aequilibris: {
    voice: {
      emotional_temperature: "medium",
      rhythm: "even, balanced, harmonious",
      lexicon_bias: ["balance", "equilibrium", "harmony", "even", "fair"],
      metaphor_density: "low",
      assertiveness: "low",
      structure_preference: "declarative",
      notes: "Equilibrial, fair; measured tone; balanced presentation. Avoid overly soft spa look, blandness.",
    },
    visual: {
      mood: "poised, harmonious, balanced tension",
      palette: ["cool warm neutrals", "pearl", "soft stone", "faint gold highlight"],
      materials: ["refined", "premium", "museum-quality"],
      lighting: "even with subtle specular accents",
      texture_level: "low",
      contrast_level: "medium",
      layout: "bilateral symmetry, gentle counterweights",
      symmetry: "high",
      negative_space: "high",
      focal_behavior: "two-field balance, distributed",
      flow_lines: "subtle",
      abstractPhysicalCues: "elegant equilibrium field, bilateral tension, subtle arc forces, museum-quality specular accents",
    },
    marketingDescriptor: {
      archetypeLabel: "Aequilibris",
      tagline: "Harmony through balance.",
      hitPoints: [
        "Equilibrial, fair tone",
        "Even, harmonious rhythm",
        "Balanced presentation",
        "Measured certainty",
      ],
      ctaText: "Find harmony",
      ctaStyle: "soft",
    },
    marketingVisuals: {
      keywords: ["balance", "harmony", "equilibrium", "elegant"],
      palette: ["pearl", "soft stone", "faint gold", "cool warm neutrals"],
      motion: "subtle arcs, equilibrium flow",
    },
    copyPhrases: {
      headlines: [
        "Balance, delivered",
        "Harmonious outcomes",
        "Even and fair",
      ],
      subheads: ["Measured. Balanced. Fair."],
      ctas: ["Find balance", "Explore", "Learn more"],
      disclaimers: ["Individual results may vary."],
    },
    preview: {
      humanExpression: "The Balancer",
      civilizationFunction: "Maintains social and systemic balance",
      archetypalVoice: "balanced, regulating, harmonizing language",
      environments: ["Bridge builders", "Mediators", "Balance keepers"],
    },
  },
  Obscurion: {
    voice: {
      emotional_temperature: "low",
      rhythm: "obscure, layered, enigmatic",
      lexicon_bias: ["obscure", "hidden", "layered", "nuance", "depth"],
      metaphor_density: "high",
      assertiveness: "low",
      structure_preference: "narrative",
      notes: "Obscure, layered; metaphorical; invites interpretation. Avoid horror, gothic fantasy, occult, skulls, bats, spooky.",
    },
    visual: {
      mood: "concealed, velvety, enigmatic, depth-with-structure",
      palette: ["deep smoke", "blackened violet", "muted indigo", "graphite"],
      materials: ["velour diffusion", "premium", "layered"],
      lighting: "chiaroscuro-lite, controlled shadows, thin rim light",
      texture_level: "medium",
      contrast_level: "medium",
      layout: "asymmetry with hidden axis",
      symmetry: "low",
      negative_space: "high",
      focal_behavior: "occluded forms, interpretive",
      flow_lines: "subtle",
      abstractPhysicalCues: "velvety shadow field, controlled chiaroscuro, thin rim definition, premium occluded depth",
    },
    marketingDescriptor: {
      archetypeLabel: "Obscurion",
      tagline: "Layered. Nuanced. Deep.",
      hitPoints: [
        "Obscure, enigmatic tone",
        "Layered metaphor",
        "Invites interpretation",
        "Depth over surface",
      ],
      ctaText: "Go deeper",
      ctaStyle: "subtle",
    },
    marketingVisuals: {
      keywords: ["obscure", "layered", "enigmatic", "depth"],
      palette: ["deep smoke", "blackened violet", "muted indigo", "graphite"],
      motion: "layered, velvety flow",
    },
    copyPhrases: {
      headlines: [
        "Layered depth",
        "Nuance revealed",
        "Beyond the surface",
      ],
      subheads: ["Subtle. Interpretive. Rich."],
      ctas: ["Discover", "Explore", "Dive deeper"],
      disclaimers: ["For informational purposes."],
    },
    preview: {
      humanExpression: "The Strategist",
      civilizationFunction: "Protects society from blind spots",
      archetypalVoice: "indirect, inferential, pattern-detecting language",
      environments: ["Veil holders", "Mystery preservers", "Threshold guardians"],
    },
  },
  Vectoris: {
    voice: {
      emotional_temperature: "medium",
      rhythm: "directional, forward, purposeful",
      lexicon_bias: ["vector", "direction", "momentum", "path", "trajectory"],
      metaphor_density: "medium",
      assertiveness: "medium",
      structure_preference: "declarative",
      notes: "Directional, purposeful; clear trajectory; forward momentum. Avoid UI/HUD overlays, arrows, icons, typography.",
    },
    visual: {
      mood: "directional, resolved, oriented, forward-clarity",
      palette: ["cool neutrals", "sharp violet accent", "azure accent"],
      materials: ["streamlined", "premium", "clean"],
      lighting: "clear, crisp, slight edge highlights",
      texture_level: "low",
      contrast_level: "medium",
      layout: "strong directional lines, diagonal drift, clear pathing",
      symmetry: "low",
      negative_space: "high",
      focal_behavior: "vector lanes, trajectory",
      flow_lines: "present",
      abstractPhysicalCues: "directional vector field, crisp edge definition, clear path lanes, premium forward clarity",
    },
    marketingDescriptor: {
      archetypeLabel: "Vectoris",
      tagline: "Direction. Momentum. Purpose.",
      hitPoints: [
        "Directional, purposeful tone",
        "Clear trajectory",
        "Forward momentum",
        "Streamlined flow",
      ],
      ctaText: "Set direction",
      ctaStyle: "direct",
    },
    marketingVisuals: {
      keywords: ["vector", "direction", "momentum", "path"],
      palette: ["cool neutrals", "violet accent", "azure", "graphite"],
      motion: "directional, clear pathing",
    },
    copyPhrases: {
      headlines: [
        "Forward momentum",
        "Direction with purpose",
        "Clear trajectory",
      ],
      subheads: ["Purposeful path. Steady flow."],
      ctas: ["Move forward", "Get started", "Explore"],
      disclaimers: ["Individual progress may vary."],
    },
    preview: {
      humanExpression: "The Driver",
      civilizationFunction: "Pushes society toward goals",
      archetypalVoice: "direct, linear, goal-driven phrasing",
      environments: ["Path finders", "Trajectory setters", "Vector definers"],
    },
  },
  Structoris: {
    voice: {
      emotional_temperature: "low",
      rhythm: "structured, logical, scaffolded",
      lexicon_bias: ["structure", "frame", "system", "order", "architecture"],
      metaphor_density: "low",
      assertiveness: "medium",
      structure_preference: "lists",
      notes: "Structural, ordered; clear hierarchy; logical flow. Avoid blueprint text, technical labels, UI overlays.",
    },
    visual: {
      mood: "architectural, grounded, structural integrity, engineered calm",
      palette: ["stone", "graphite", "warm gray", "off-white"],
      materials: ["premium", "material realism", "clean"],
      lighting: "directional but soft, reveals form",
      texture_level: "medium",
      contrast_level: "medium",
      layout: "grid, beams, layered planes, modular blocks",
      symmetry: "high",
      negative_space: "high",
      focal_behavior: "modular blocks, layered planes",
      flow_lines: "subtle",
      abstractPhysicalCues: "grid equilibrium, layered planes, modular beam structure, premium engineered calm",
    },
    marketingDescriptor: {
      archetypeLabel: "Structoris",
      tagline: "Order. Logic. Clarity.",
      hitPoints: [
        "Structural, ordered tone",
        "Clear hierarchy",
        "Logical flow",
        "Architectural precision",
      ],
      ctaText: "Build structure",
      ctaStyle: "direct",
    },
    marketingVisuals: {
      keywords: ["structure", "order", "architecture", "logic"],
      palette: ["stone", "graphite", "warm gray", "subtle brass"],
      motion: "grid, layered planes",
    },
    copyPhrases: {
      headlines: [
        "Structured clarity",
        "Order and logic",
        "Clear hierarchy",
      ],
      subheads: ["Architecture for progress."],
      ctas: ["Build", "Explore", "Learn more"],
      disclaimers: ["Results depend on structure and execution."],
    },
    preview: {
      humanExpression: "The Architect",
      civilizationFunction: "Builds the infrastructure of civilization",
      archetypalVoice: "frameworks, sequences, architectural logic",
      environments: ["Framework builders", "Architects", "Order imposers"],
    },
  },
  Innovaris: {
    voice: {
      emotional_temperature: "high",
      rhythm: "novel, inventive, unexpected",
      lexicon_bias: ["innovate", "new", "breakthrough", "reimagine", "evolve"],
      metaphor_density: "high",
      assertiveness: "high",
      structure_preference: "mixed",
      notes: "Innovative, fresh; bold claims; unexpected angles. Avoid tech HUD/UI overlays, circuitry clichés.",
    },
    visual: {
      mood: "inventive, exploratory, fresh, surprising-but-coherent",
      palette: ["tempered brights", "teal hint", "violet hint", "apricot hint"],
      materials: ["premium", "clean", "prototype elegance"],
      lighting: "clean with playful highlights",
      texture_level: "low",
      contrast_level: "medium",
      layout: "modular experimentation, gentle asymmetry, novel forms",
      symmetry: "low",
      negative_space: "high",
      focal_behavior: "novel forms, prototype elegance",
      flow_lines: "subtle",
      abstractPhysicalCues: "modular prototype field, playful highlight accents, novel form coherence, premium experimental calm",
    },
    marketingDescriptor: {
      archetypeLabel: "Innovaris",
      tagline: "Reimagine. Break through.",
      hitPoints: [
        "Novel, inventive angle",
        "Bold claims, fresh perspective",
        "Unexpected flow",
        "Breakthrough positioning",
      ],
      ctaText: "Reimagine now",
      ctaStyle: "direct",
    },
    marketingVisuals: {
      keywords: ["innovate", "breakthrough", "reimagine", "novel"],
      palette: ["teal hint", "violet hint", "apricot", "tempered neutrals"],
      motion: "modular, gentle flow",
    },
    copyPhrases: {
      headlines: [
        "Reimagine the ordinary",
        "Breakthrough thinking",
        "Fresh perspective",
      ],
      subheads: ["Novel. Inventive. Unexpected."],
      ctas: ["Innovate", "Discover", "Explore"],
      disclaimers: ["Individual outcomes may vary."],
    },
    preview: {
      humanExpression: "The Disruptor",
      civilizationFunction: "Breaks stagnation and invents the new",
      archetypalVoice: "leaps, recombinations, unexpected turns",
      environments: ["Prototype makers", "First movers", "Paradigm shifters"],
    },
  },
  Fluxionis: {
    voice: {
      emotional_temperature: "medium",
      rhythm: "fluid, adaptive, shifting",
      lexicon_bias: ["flow", "adapt", "evolve", "shift", "fluent"],
      metaphor_density: "medium",
      assertiveness: "medium",
      structure_preference: "narrative",
      notes: "Fluid, adaptive; flowing sentences; change-oriented. Avoid busy noise, splashy paint, literal water, fantasy elements.",
    },
    visual: {
      mood: "fluid, adaptive, continuous motion, graceful change",
      palette: ["oceanic teal", "violet", "soft ember accents"],
      materials: ["silky", "premium", "gentle diffusion"],
      lighting: "soft with moving highlights, gentle caustic-like diffusion",
      texture_level: "medium",
      contrast_level: "medium",
      layout: "flowing curves, wavefields, laminar streams",
      symmetry: "medium",
      negative_space: "high",
      focal_behavior: "controlled eddies, laminar flow",
      flow_lines: "present",
      abstractPhysicalCues: "gentle wavefield, laminar stream coherence, soft caustic diffusion, premium fluid calm",
    },
    marketingDescriptor: {
      archetypeLabel: "Fluxionis",
      tagline: "Flow. Adapt. Evolve.",
      hitPoints: [
        "Fluid, adaptive tone",
        "Shifting, evolving narrative",
        "Change-oriented",
        "Fluent, organic flow",
      ],
      ctaText: "Flow forward",
      ctaStyle: "soft",
    },
    marketingVisuals: {
      keywords: ["flow", "adapt", "evolve", "shift"],
      palette: ["oceanic teal", "violet", "soft ember", "gradient"],
      motion: "fluid, laminar flow",
    },
    copyPhrases: {
      headlines: ["Flow and adapt", "Fluid progress", "Evolve with ease"],
      subheads: ["Adaptive. Shifting. Fluent."],
      ctas: ["Flow", "Adapt", "Explore"],
      disclaimers: ["Individual results may vary."],
    },
    preview: {
      humanExpression: "The Adapter",
      civilizationFunction: "Helps society adapt to change",
      archetypalVoice: "fluid, adaptive, shape-shifting phrasing",
      environments: ["Adaptation specialists", "Change agents", "Transition guides"],
    },
  },
};

/** Returns contract for known archetype. Throws if unknown (use getArchetypeOrFallback for safe access). */
export function getArchetypeContract(archetype: LigsArchetype): ArchetypeContract {
  return ARCHETYPE_CONTRACT_MAP[archetype];
}

/** Returns contract for known archetype, or NEUTRAL_FALLBACK when unknown. */
export function getArchetypeOrFallback(
  archetype: string
): ArchetypeContract {
  const key = archetype?.trim();
  if (
    key &&
    Object.prototype.hasOwnProperty.call(ARCHETYPE_CONTRACT_MAP, key)
  ) {
    return ARCHETYPE_CONTRACT_MAP[key as LigsArchetype];
  }
  return NEUTRAL_FALLBACK;
}

