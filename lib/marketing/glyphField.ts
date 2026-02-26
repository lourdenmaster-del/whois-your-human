/**
 * Glyph Field Renderer prompt builder.
 * Generates archetype-driven field prompts for the canonical LIGS glyph "(L)".
 * The glyph shape is invariant; only the surrounding field (color, material, lighting, etc.) shifts.
 */

import { getArchetypeOrFallback } from "@/src/ligs/archetypes/contract";

const GLYPH_FIELD_NEGATIVE =
  "extra text, additional letters, zodiac symbols, astrology icons, corporate badge, shield, crest, monogram, creatures, wings, fantasy elements, busy texture, low-end aesthetic";

/**
 * Determines Deviation Budget from archetype: HIGH for expressive, LOW for stable.
 */
function getDeviationBudget(
  emotionalTemperature: string,
  flowLines: string
): "HIGH" | "LOW" {
  if (
    emotionalTemperature === "high" ||
    flowLines === "present"
  ) {
    return "HIGH";
  }
  return "LOW";
}

/**
 * Builds the glyph field prompt for an archetype.
 * SECTION 1: Core Glyph (fixed) — "(L)" invariant.
 * SECTION 2: Archetype Field Distortion — max influence on field styling.
 *
 * @param archetype - Primary archetype (uses NEUTRAL_FALLBACK if unknown)
 * @param contrastDelta - Optional 0–1; increases clarity/energy in the field (default 0.15)
 */
export function buildGlyphFieldPrompt(
  archetype: string,
  contrastDelta?: number
): string {
  const c = getArchetypeOrFallback(archetype);
  const delta = Math.max(0, Math.min(1, contrastDelta ?? 0.15));
  const clarity = delta > 0.3 ? "slightly increased clarity" : "";
  const energy = delta > 0.5 ? "subtle energy lift" : "";

  const deviationBudget = getDeviationBudget(
    c.voice.emotional_temperature,
    c.visual.flow_lines
  );

  const fieldParts = [
    // palette
    `palette: ${c.visual.palette.join(", ")}`,
    c.marketingVisuals.palette.length
      ? `accent palette: ${c.marketingVisuals.palette.join(", ")}`
      : null,
    // mood
    `mood: ${c.visual.mood}`,
    c.marketingVisuals.keywords.length
      ? `keywords: ${c.marketingVisuals.keywords.join(", ")}`
      : null,
    // material & lighting
    `material rendering: ${c.visual.materials.join(", ")}`,
    `lighting: ${c.visual.lighting}`,
    `texture level: ${c.visual.texture_level}`,
    `contrast: ${c.visual.contrast_level}`,
    // flow & motion
    c.visual.flow_lines !== "none"
      ? `flow lines: ${c.visual.flow_lines}`
      : null,
    `motion/energy: ${c.marketingVisuals.motion}`,
    c.visual.focal_behavior ? `focal behavior: ${c.visual.focal_behavior}` : null,
    // delta modifiers
    clarity,
    energy,
    // budget
    `Deviation Budget: ${deviationBudget}`,
    // constraints
    "no extra text beyond the glyph",
    "no zodiac symbols",
    "no corporate badge shapes",
    "no creatures, wings, fantasy",
    "premium, minimal, high-end",
  ].filter((x): x is string => Boolean(x));

  const section1 = [
    "SECTION 1 — Core Glyph (fixed)",
    "The central symbol is exactly \"(L)\" — a capital letter L inside parentheses.",
    "Preserve characters and topology exactly. High legibility.",
    "Centered composition. The glyph shape is invariant.",
  ].join(" ");

  const section2 = [
    "SECTION 2 — Archetype Field Distortion",
    "Maximum archetype influence on the field surrounding the glyph:",
    "color shifts, material rendering (glass, metal, matte, luminous, etc.), glow intensity,",
    "field density, environmental energy, atmosphere, background depth, texture.",
    fieldParts.join(". "),
  ].join(" ");

  return [section1, section2].join("\n\n").trim();
}

/** Negative prompt for glyph field generation. */
export function getGlyphFieldNegative(): string {
  return GLYPH_FIELD_NEGATIVE;
}

/*
 * Example generated prompts (contrastDelta = 0.15):
 *
 * --- Stabiliora ---
 * SECTION 1 — Core Glyph (fixed) The central symbol is exactly "(L)" — a capital letter L inside parentheses. Preserve characters and topology exactly. High legibility. Centered composition. The glyph shape is invariant.
 *
 * SECTION 2 — Archetype Field Distortion Maximum archetype influence on the field surrounding the glyph: color shifts, material rendering (glass, metal, matte, luminous, etc.), glow intensity, field density, environmental energy, atmosphere, background depth, texture. palette: warm-neutral, soft earth tones, muted, soft neutrals. accent palette: blush, cream, rosewater, lavender. mood: calm, regulated, coherent. keywords: balance, coherence, regulation. material rendering: organic, natural, minimal. lighting: soft, even, diffused. texture level: low. contrast: low. flow lines: subtle. motion/energy: symmetrical flow lines. focal behavior: single point, gentle. Deviation Budget: LOW. no extra text beyond the glyph. no zodiac symbols. no corporate badge shapes. no creatures, wings, fantasy. premium, minimal, high-end.
 *
 * --- Radiantis ---
 * SECTION 1 — Core Glyph (fixed) The central symbol is exactly "(L)" — a capital letter L inside parentheses. Preserve characters and topology exactly. High legibility. Centered composition. The glyph shape is invariant.
 *
 * SECTION 2 — Archetype Field Distortion Maximum archetype influence on the field surrounding the glyph: color shifts, material rendering (glass, metal, matte, luminous, etc.), glow intensity, field density, environmental energy, atmosphere, background depth, texture. palette: light, bright, warm whites. accent palette: light, bright, warm whites, cream. mood: luminous, illuminating, expansive. keywords: light, illuminate, clarity, radiance. material rendering: translucent, light-catching. lighting: bright, radiant. texture level: low. contrast: medium. flow lines: present. motion/energy: radiating, central flow. focal behavior: radiating, central. Deviation Budget: HIGH. no extra text beyond the glyph. no zodiac symbols. no corporate badge shapes. no creatures, wings, fantasy. premium, minimal, high-end.
 *
 * --- Tenebris ---
 * SECTION 1 — Core Glyph (fixed) The central symbol is exactly "(L)" — a capital letter L inside parentheses. Preserve characters and topology exactly. High legibility. Centered composition. The glyph shape is invariant.
 *
 * SECTION 2 — Archetype Field Distortion Maximum archetype influence on the field surrounding the glyph: color shifts, material rendering (glass, metal, matte, luminous, etc.), glow intensity, field density, environmental energy, atmosphere, background depth, texture. palette: dark, shadow, deep tones. accent palette: deep, shadow, charcoal, muted. mood: contemplative, subtle, mysterious. keywords: shadow, depth, mystery, quiet. material rendering: layered, nuanced. lighting: low, chiaroscuro. texture level: medium. contrast: medium. motion/energy: subtle, contemplative. focal behavior: single point, quiet. Deviation Budget: LOW. no extra text beyond the glyph. no zodiac symbols. no corporate badge shapes. no creatures, wings, fantasy. premium, minimal, high-end.
 */
