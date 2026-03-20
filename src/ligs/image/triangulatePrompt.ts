/**
 * 3-stage triangulation: Primary (solar anchor) + Secondary (interference) → Coherence prompt.
 * Image-model clean: single visual-grammar line, normalized bullet order, hard secondary limits.
 */

import type { LigsArchetype } from "../voice/schema";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";
import { getSolarSeasonIndexFromLongitude } from "@/src/ligs/astronomy/solarSeason";
import { getArchetypeVoiceAnchorShape, getArchetypeVisualMapShape } from "@/src/ligs/archetypes/adapters";
import { getArchetypePhraseBank } from "../voice/archetypePhraseBank";

const NEGATIVE_EXCLUSIONS = [
  "text", "letters", "logo", "watermark", "signature", "face", "person",
  "figure", "silhouette", "astrology", "zodiac", "symbols", "busy texture", "high contrast",
];

const MARKETING_NEGATIVE_ADDITIONS = ["no embedded text", "no UI elements"];

/** Tenebris: avoid horror/gothic aesthetic per contract. */
const TENEBRIS_NEGATIVE_ADDITIONS = ["spooky", "scary", "skulls", "horror", "occult symbols", "gothic fantasy"];

/** Radiantis: avoid neon/sci-fi/stock aesthetic per contract. */
const RADIANTIS_NEGATIVE_ADDITIONS = ["lens flares", "glitter", "neon", "sci-fi", "cheesy", "inspirational stock", "stock photo"];

/** Precisura: avoid messy/painterly/HUD aesthetic per contract. */
const PRECISURA_NEGATIVE_ADDITIONS = ["messy gradients", "painterly chaos", "tech HUD", "glare"];

/** Aequilibris: avoid spa/bland aesthetic per contract. */
const AEQUILIBRIS_NEGATIVE_ADDITIONS = ["spa look", "bland", "sterile generic"];

/** Obscurion: avoid horror/gothic aesthetic per contract (distinct from Tenebris nocturne). */
const OBSCURION_NEGATIVE_ADDITIONS = ["horror", "gothic fantasy", "occult symbols", "skulls", "bats", "spooky"];

/** Vectoris: avoid UI/HUD/icon aesthetic per contract. */
const VECTORIS_NEGATIVE_ADDITIONS = ["HUD overlay", "arrows", "icons", "typography"];

/** Structoris: avoid blueprint/technical/UI aesthetic per contract. */
const STRUCTORIS_NEGATIVE_ADDITIONS = ["blueprint text", "technical labels", "UI overlay", "dimensions"];

/** Innovaris: avoid tech/cyber aesthetic per contract. */
const INNOVARIS_NEGATIVE_ADDITIONS = ["tech HUD", "circuitry", "cyberpunk", "neon"];

/** Fluxionis: avoid busy/literal/fantasy aesthetic per contract. */
const FLUXIONIS_NEGATIVE_ADDITIONS = ["busy noise", "splashy paint", "literal water", "fantasy elements", "rainbow"];

/** Forbidden in secondary block: palette/structure/focal domain (not texture/motion/contrast). */
const SECONDARY_FORBIDDEN = new Set([
  "palette", "structure", "focal", "layout", "symmetry", "composition", "color", "hue",
  "mood", "expansive", "radiating", "central", "balanced", "centered", "grid", "mirror",
  "hierarchical", "single point", "geometry", "distributed",
]);

export type TriangulateMode =
  | "variation"
  | "signature"
  | "marketing_logo_mark"
  | "marketing_background"
  | "marketing_overlay"
  | "share_card";

export interface SolarProfile {
  sunLonDeg: number;
  twilightPhase: "day" | "civil" | "nautical" | "astronomical" | "night";
}

export interface TriangulateOptions {
  mode: TriangulateMode;
  seed?: string;
  entropy?: number;
  /** When set, used to pick high-energy vs calm motion line in secondary block. */
  primaryArchetype?: LigsArchetype;
}

/** Primary archetype from solar longitude. 12 equal 30° segments, 0° = vernal equinox. */
export function getPrimaryArchetypeFromSolarLongitude(sunLonDeg: number): LigsArchetype {
  const index = getSolarSeasonIndexFromLongitude(sunLonDeg);
  return LIGS_ARCHETYPES[index];
}

/** Archetype-specific secondary picks for null/same. Ignispectrum → Vectoris (reinforce ignition). Calm primaries keep next. */
const HIGH_ENERGY_SECONDARY_MAP: Partial<Record<LigsArchetype, LigsArchetype>> = {
  Ignispectrum: "Vectoris",
};

/** Secondary archetype; if same as primary, use archetype-aware pick or next by index. */
export function resolveSecondaryArchetype(
  secondaryFromReport: LigsArchetype,
  primaryArchetype: LigsArchetype
): LigsArchetype {
  if (secondaryFromReport !== primaryArchetype) return secondaryFromReport;
  const override = HIGH_ENERGY_SECONDARY_MAP[primaryArchetype];
  if (override) return override;
  const idx = LIGS_ARCHETYPES.indexOf(primaryArchetype);
  const nextIdx = (idx + 1) % 12;
  return LIGS_ARCHETYPES[nextIdx];
}

function simpleHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

function seededPick<T>(arr: readonly T[], seed: string, count: number): T[] {
  if (arr.length === 0 || count <= 0) return [];
  const start = (simpleHash(seed) >>> 0) % arr.length;
  const result: T[] = [];
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    result.push(arr[(start + i) % arr.length]);
  }
  return result;
}

const PHRASE_TO_VISUAL: Record<string, string> = {
  "soft light through sheer curtains": "diffused light, soft edges",
  "still water in a shallow bowl": "reflective calm, minimal motion",
  "embers banked, waiting to catch": "warm edge-glow, banked intensity",
  "shadow pooled in the corner": "depth where light bends away",
  "light through a prism, split to color": "spectral split, prismatic dispersion",
  "scales level, nothing moving": "horizontal equilibrium, symmetry",
  "fog lifting in layers": "layered translucency",
  "arrow released toward target": "directional momentum, single vector",
  "current that carries without grasping": "fluid flow, adaptive curves",
};

function phraseToVisual(phrase: string): string | null {
  const direct = PHRASE_TO_VISUAL[phrase];
  if (direct) return direct;
  const lower = phrase.toLowerCase();
  if (lower.includes("light") || lower.includes("glow")) return "soft luminosity, edge-glow";
  if (lower.includes("shadow") || lower.includes("dark")) return "depth, gradient fade";
  if (lower.includes("balance")) return "horizontal equilibrium";
  if (lower.includes("flow")) return "fluid curves, directional flow";
  return null;
}

/** Truncate at last complete line within maxChars. */
function truncateAtLineBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastNewline = truncated.lastIndexOf("\n");
  if (lastNewline > 0) return truncated.slice(0, lastNewline + 1).trimEnd();
  return truncated;
}

/** Single compact visual-grammar line: palette bias, composition, light behavior. No repeated adjectives. */
function buildPrimaryVisualGrammarLine(primaryArchetype: LigsArchetype): string {
  const visual = getArchetypeVisualMapShape(primaryArchetype);
  const p0 = visual.palette[0]?.toLowerCase().replace(/\s+/g, "-") ?? "neutral";
  const p1 = visual.palette[1]?.toLowerCase().split(/[\s,]+/)[0] ?? "";
  const paletteBias = p1 ? `${p0}-${p1} spectrum` : `${p0} spectrum`;
  const layoutWords = visual.layout.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 2);
  const compDedup = [...new Set(layoutWords)].slice(0, 2).join(" ") || "centered balanced";
  const lightWords = (visual.focal_behavior + " " + visual.lighting).toLowerCase().split(/[\s,]+/).filter((w) => w.length > 2);
  const lightDedup = [...new Set(lightWords)].slice(0, 2).join(" ") || "soft diffusion";
  return `PRIMARY: ${paletteBias}, ${compDedup} geometry, ${lightDedup}`;
}

/** High-energy archetypes: use premium/high-clarity directive instead of soft for marketing_background. */
function isHighEnergyArchetype(primaryArchetype: LigsArchetype): boolean {
  const visual = getArchetypeVisualMapShape(primaryArchetype);
  if (visual.contrast_level === "high") return true;
  const mood = visual.mood.toLowerCase();
  return mood.includes("energetic") || mood.includes("vivid") || mood.includes("intense");
}

/** CENTER VOID (FIELD-FIRST): for Ignispectrum marketing_background. Reserve center for glyph anchor; field radiates outward. */
const CENTER_VOID_IGNIS = `CENTER VOID (ANCHOR SPACE):
- Create a clear radial origin at center.
- Leave a soft circular region of negative space at the center (about 1/3 of frame width), smooth gradient, low texture.
- The Ignis field grows outward from that origin: warm ember/amber spectrum, white-hot core diffusion, directional energy shear, subtle prismatic heat haze.
- No typography, no corporate marks, no additional graphic elements.`;

/** Mode directive line (short header). Archetype-aware for marketing_background. */
function getModeDirective(mode: TriangulateMode, primaryArchetype?: LigsArchetype): string {
  if (mode === "variation") return "Variation: abstract premium background.";
  if (mode === "signature") return "Signature: archetype-coherent aesthetic field.";
  if (mode === "marketing_logo_mark") return "Logo mark: abstract premium symbol, single focal element, centered, strong silhouette, favicon-like.";
  if (mode === "marketing_background") {
    if (primaryArchetype === "Ignispectrum") {
      return "Marketing background (FIELD-FIRST): center void for glyph anchor, field radiates outward.";
    }
    if (primaryArchetype && isHighEnergyArchetype(primaryArchetype)) {
      return "Marketing background: full-width, premium negative space, high-clarity field.";
    }
    return "Marketing background: full-width, soft, broad negative space.";
  }
  if (mode === "marketing_overlay") return "Marketing overlay: full-width, clean region for overlay.";
  if (mode === "share_card") return "Share card: full-width, framed subject region, strong clarity.";
  return "Abstract premium background.";
}

/** Negative-space line for marketing modes. Differentiate background vs share_card vs logo. */
function getNegativeSpaceLine(mode: TriangulateMode): string | null {
  if (mode === "marketing_logo_mark") {
    return "• Negative space: minimal, scalable symbol, transparent or solid neutral";
  }
  if (mode === "marketing_background") {
    return "• Negative space: broad, minimal texture, soft gradients, leave room for overlay";
  }
  if (mode === "share_card") {
    return "• Negative space: top band clear, framed center, stronger edge definition";
  }
  if (mode === "marketing_overlay") {
    return "• Negative space: left column clear, framed center for overlay";
  }
  return null;
}

/** Motion line: high-energy primary → directional momentum; calm → smooth transitions. */
function getMotionLine(secondaryArchetype: LigsArchetype, primaryArchetype?: LigsArchetype): string {
  if (primaryArchetype && isHighEnergyArchetype(primaryArchetype)) {
    return "directional momentum, crisp drift";
  }
  const anchor = getArchetypeVoiceAnchorShape(secondaryArchetype);
  return anchor.rhythm.toLowerCase().includes("dynamic") ? "directional flow" : "smooth transitions";
}

/** Secondary block: texture/motion/contrast only. Max 2 lines. No Palette/Structure/Focal words. */
export function buildSecondaryImageBlock(
  secondaryArchetype: LigsArchetype,
  options: TriangulateOptions
): string[] {
  const seed = options.seed ?? `secondary-${secondaryArchetype}`;
  const anchor = getArchetypeVoiceAnchorShape(secondaryArchetype);
  const tempMap = { low: "muted", medium: "balanced", high: "vibrant" } as const;
  const assertMap = { low: "soft", medium: "moderate", high: "bold" } as const;
  const motion = getMotionLine(secondaryArchetype, options.primaryArchetype);
  const lines: string[] = [
    `• Modulate: ${tempMap[anchor.emotional_temperature]} temp, ${assertMap[anchor.assertiveness]} contrast`,
    `• Motion: ${motion}`,
  ];
  const filtered = lines.filter((line) => {
    const lower = line.toLowerCase();
    return ![...SECONDARY_FORBIDDEN].some((w) => lower.includes(w));
  });
  return filtered.slice(0, 2);
}

/** Primary block raw data for coherence assembly. */
function buildPrimaryBlockData(
  primaryArchetype: LigsArchetype,
  options: TriangulateOptions
): { palette: string; structure: string; focal: string; texture: string } {
  const visual = getArchetypeVisualMapShape(primaryArchetype);
  const isMarketing =
    options.mode === "marketing_logo_mark" ||
    options.mode === "marketing_background" ||
    options.mode === "marketing_overlay" ||
    options.mode === "share_card";
  const symmetry = isMarketing && visual.symmetry === "low" ? "medium" : visual.symmetry;
  const textureHint = isMarketing ? "minimal texture" : visual.materials.slice(0, 2).join(", ");
  return {
    palette: visual.palette.slice(0, 3).join(", "),
    structure: `${visual.layout}, ${symmetry} symmetry`,
    focal: visual.focal_behavior,
    texture: textureHint,
  };
}

/** Assemble normalized bullet block: palette → structure → focal → texture → physical cue → negative space → secondary → twilight. */
function buildResolvedBlock(
  primaryArchetype: LigsArchetype,
  secondaryLines: string[],
  twilightPhase: string,
  mode: TriangulateOptions["mode"]
): string {
  const data = buildPrimaryBlockData(primaryArchetype, { mode });
  const parts: string[] = [
    `• Palette: ${data.palette}`,
    `• Structure: ${data.structure}`,
    `• Focal: ${data.focal}`,
    `• Texture: ${data.texture}`,
  ];
  const visual = getArchetypeVisualMapShape(primaryArchetype);
  const physicalCues = visual.abstractPhysicalCues?.trim();
  if (physicalCues && (mode === "marketing_background" || mode === "marketing_overlay" || mode === "share_card")) {
    parts.push(`• Field: ${physicalCues}`);
  }
  const negSpace = getNegativeSpaceLine(mode);
  if (negSpace) parts.push(negSpace);
  if (secondaryLines.length > 0) {
    parts.push("");
    parts.push(...secondaryLines);
  }
  const phase = twilightPhase.toLowerCase();
  const twilightMods: Record<string, string> = {
    day: "full luminance, minimal glow",
    civil: "soft edge-glow, gentle contrast",
    nautical: "reduced luminance, increased abstraction, peripheral glow",
    astronomical: "low luminance, deep abstraction, edge emphasis",
    night: "minimal luminance, maximal abstraction, silhouette emphasis",
  };
  const mod = twilightMods[phase] ?? twilightMods.nautical;
  parts.push("");
  parts.push(`• Twilight (${phase}): ${mod}`);
  return parts.join("\n");
}

/** Apply hard secondary limits: filter forbidden, max 2 lines, char cap 35% of primary. */
function enforceSecondaryLimits(
  secondaryLines: string[],
  primaryBlockChars: number
): string[] {
  const maxChars = Math.floor(primaryBlockChars * 0.35);
  let out = secondaryLines.slice(0, 2);
  const joined = out.join("\n");
  if (joined.length > maxChars) {
    const single = out[0];
    if (single.length <= maxChars) {
      out = [single];
    } else {
      out = [truncateAtLineBoundary(single, maxChars)];
    }
  }
  return out;
}

/** Resolved coherence block (legacy export). */
export function buildCoherenceImageBlock(
  primaryBlock: string,
  secondaryBlock: string,
  _options: TriangulateOptions
): string {
  const secRaw = secondaryBlock.split("\n").filter((l) => l.trim().startsWith("•"));
  const secondaryLines = enforceSecondaryLimits(
    secRaw.filter((l) => {
      const lower = l.toLowerCase();
      return ![...SECONDARY_FORBIDDEN].some((w) => lower.includes(w));
    }).slice(0, 2),
    primaryBlock.length
  );
  const pLines = primaryBlock.split("\n");
  const paletteLine = pLines.find((l) => l.includes("• Palette:"));
  const structureLine = pLines.find((l) => l.includes("• Structure:"));
  const focalLine = pLines.find((l) => l.includes("• Focal:"));
  const textureLine = pLines.find((l) => l.includes("• Texture:"));
  const resolved: string[] = [paletteLine, structureLine, focalLine, textureLine].filter(
    (l): l is string => !!l
  );
  if (secondaryLines.length > 0) {
    resolved.push("");
    resolved.push(...secondaryLines);
  }
  return resolved.join("\n").trim();
}

/** Primary block (legacy export). */
export function buildPrimaryImageBlock(
  primaryArchetype: LigsArchetype,
  solarProfile: SolarProfile,
  options: TriangulateOptions
): string {
  const data = buildPrimaryBlockData(primaryArchetype, options);
  return [
    `• Primary: ${data.palette}`,
    `• Palette: ${data.palette}`,
    `• Structure: ${data.structure}`,
    `• Focal: ${data.focal}`,
    `• Texture: ${data.texture}`,
  ].join("\n");
}

/** Mode-specific modifiers. */
function getModeModifiers(mode: TriangulateMode): { entropyScale: number } {
  const isMarketing =
    mode === "marketing_logo_mark" ||
    mode === "marketing_background" ||
    mode === "marketing_overlay" ||
    mode === "share_card";
  const entropyScale =
    mode === "marketing_logo_mark" ? 0.5 :
    mode === "marketing_background" ? 0.6 : isMarketing ? 0.8 : 1;
  return { entropyScale };
}

export interface BuildTriangulatedImagePromptInput {
  primaryArchetype: LigsArchetype;
  secondaryArchetype: LigsArchetype;
  solarProfile: SolarProfile;
  twilightPhase: string;
  mode: TriangulateMode;
  seed?: string;
  entropy?: number;
  /** Optional base prompt (e.g. E.V.E. imagery prompt for signature mode). */
  basePrompt?: string;
}

function getNegativeForMode(mode: TriangulateMode, primaryArchetype?: LigsArchetype): string {
  const base = NEGATIVE_EXCLUSIONS.join(", ");
  const isMarketing =
    mode === "marketing_logo_mark" ||
    mode === "marketing_background" ||
    mode === "marketing_overlay" ||
    mode === "share_card";
  const additions = [...MARKETING_NEGATIVE_ADDITIONS];
  if (isMarketing && primaryArchetype === "Tenebris") {
    additions.push(...TENEBRIS_NEGATIVE_ADDITIONS);
  }
  if (isMarketing && primaryArchetype === "Radiantis") {
    additions.push(...RADIANTIS_NEGATIVE_ADDITIONS);
  }
  if (isMarketing && primaryArchetype === "Precisura") {
    additions.push(...PRECISURA_NEGATIVE_ADDITIONS);
  }
  if (isMarketing && primaryArchetype === "Aequilibris") {
    additions.push(...AEQUILIBRIS_NEGATIVE_ADDITIONS);
  }
  if (isMarketing && primaryArchetype === "Obscurion") {
    additions.push(...OBSCURION_NEGATIVE_ADDITIONS);
  }
  if (isMarketing && primaryArchetype === "Vectoris") {
    additions.push(...VECTORIS_NEGATIVE_ADDITIONS);
  }
  if (isMarketing && primaryArchetype === "Structoris") {
    additions.push(...STRUCTORIS_NEGATIVE_ADDITIONS);
  }
  if (isMarketing && primaryArchetype === "Innovaris") {
    additions.push(...INNOVARIS_NEGATIVE_ADDITIONS);
  }
  if (isMarketing && primaryArchetype === "Fluxionis") {
    additions.push(...FLUXIONIS_NEGATIVE_ADDITIONS);
  }
  if (!isMarketing) return base;
  return [base, ...additions].join(", ");
}

/** Full triangulated prompt. Image-model clean: PRIMARY visual-grammar line, normalized bullets, hard secondary limits. */
export function buildTriangulatedImagePrompt(input: BuildTriangulatedImagePromptInput): {
  positive: string;
  negative: string;
} {
  const { primaryArchetype, secondaryArchetype, solarProfile, twilightPhase, mode, seed, basePrompt } =
    input;
  const options: TriangulateOptions = {
    mode,
    seed: seed ?? `${primaryArchetype}-${secondaryArchetype}`,
    entropy: (input.entropy ?? 0.2) * getModeModifiers(mode).entropyScale,
    primaryArchetype,
  };

  const primaryGrammarLine = buildPrimaryVisualGrammarLine(primaryArchetype);
  const primaryData = buildPrimaryBlockData(primaryArchetype, options);
  const primaryBlockForCharCount = [
    `• Palette: ${primaryData.palette}`,
    `• Structure: ${primaryData.structure}`,
    `• Focal: ${primaryData.focal}`,
    `• Texture: ${primaryData.texture}`,
  ].join("\n");

  const secondaryRaw = buildSecondaryImageBlock(secondaryArchetype, options);
  const secondaryLines = enforceSecondaryLimits(secondaryRaw, primaryBlockForCharCount.length);

  const resolvedBlock = buildResolvedBlock(primaryArchetype, secondaryLines, twilightPhase, mode);

  const modeDirective = getModeDirective(mode, primaryArchetype);
  const negative = getNegativeForMode(mode, primaryArchetype);

  const centerVoidBlock =
    primaryArchetype === "Ignispectrum" && mode === "marketing_background"
      ? `\n\n${CENTER_VOID_IGNIS}\n\n`
      : "";

  let positive: string;
  if (basePrompt && basePrompt.trim()) {
    positive = `${modeDirective}\n${primaryGrammarLine}${centerVoidBlock}${basePrompt.trim()}\n\n${resolvedBlock}`;
  } else {
    positive = `${modeDirective}\n${primaryGrammarLine}${centerVoidBlock}${resolvedBlock}`;
  }
  positive = positive.replace(/\n{3,}/g, "\n\n").trim();

  positive = positive.slice(0, 3500);
  return { positive, negative };
}

/** Full provider string: positive + " Avoid: " + negative + "." (DALL-E 3 style) */
export function buildProviderPromptString(positive: string, negative: string): string {
  return `${positive} Avoid: ${negative}.`.slice(0, 4000);
}

export { NEGATIVE_EXCLUSIONS };
