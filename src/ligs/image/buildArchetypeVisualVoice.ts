/**
 * Semi-living archetype visuals: fixed spine + seeded variability.
 * Translates voice contract + phrase banks into abstract visual directives.
 * Never outputs literal objects.
 */

import type { LigsArchetype } from "../voice/schema";
import { getArchetypeVoiceAnchorShape } from "@/src/ligs/archetypes/adapters";
import { getArchetypePhraseBank } from "../voice/archetypePhraseBank";

export type ArchetypeVisualVoiceMode = "exemplar" | "variation" | "signature";

export interface BuildArchetypeVisualVoiceOptions {
  mode: ArchetypeVisualVoiceMode;
  entropy?: number;
  seed?: string;
}

/** Map sensory metaphor phrases to abstract visual cues (no literal objects). */
const SENSORY_TO_VISUAL: Record<string, string> = {
  "soft light through sheer curtains": "diffused light, soft edges, no hard shadows",
  "still water in a shallow bowl": "reflective calm, minimal motion",
  "warm stone underfoot at dawn": "warm undertones, grounded base",
  "quiet room, dust motes in a single beam": "single beam, dust-in-light atmosphere",
  "symmetry that calms the eye": "mirror symmetry, calming balance",
  "embers banked, waiting to catch": "warm edge-glow, banked intensity",
  "flame flickers at the edge of vision": "flickering light at periphery",
  "heat rising through cold stone": "warm through cool, gradual emergence",
  "glow in the periphery before dawn": "peripheral luminosity, pre-dawn tones",
  "sparks when friction meets intent": "spark at contact, friction-glow",
  "mirror reflecting mirror": "infinite depth, layered reflection",
  "shadow pooled in the corner": "depth where light bends away",
  "light through a prism, split to color": "spectral split, prismatic dispersion",
  "scales level, nothing moving": "horizontal balance, static equilibrium",
  "fog lifting in layers": "layered translucency, gradual reveal",
  "arrow released toward target": "directional momentum, single vector",
  "scaffold holding weight": "structural grid, visible frame",
  "current that carries without grasping": "fluid flow, adaptive curves",
  "hinge that opens a new angle": "angular shift, break in pattern",
};

/** Map behavioral phrases to abstract visual cues. */
function behavioralToVisual(phrase: string): string | null {
  const lower = phrase.toLowerCase();
  if (lower.includes("return") || lower.includes("place") || lower.includes("order")) return "ordered arrangement, return to center";
  if (lower.includes("pause") || lower.includes("before")) return "held moment, restrained motion";
  if (lower.includes("routine") || lower.includes("spontaneity")) return "repeating rhythm, predictable flow";
  if (lower.includes("off-center") || lower.includes("center")) return "centered focus, balanced axis";
  if (lower.includes("jump") || lower.includes("before") || lower.includes("plan")) return "anticipatory motion, forward-lean";
  if (lower.includes("cut") || lower.includes("hesitation")) return "decisive edge, clean break";
  if (lower.includes("energized") || lower.includes("drained")) return "energy gradient, draw and release";
  return null;
}

/** Map relational phrases to abstract visual cues. */
function relationalToVisual(phrase: string): string | null {
  const lower = phrase.toLowerCase();
  if (lower.includes("steadied") || lower.includes("calm")) return "steadying presence, calm center";
  if (lower.includes("withdraw") || lower.includes("chaos")) return "retreat into clarity, boundary of calm";
  if (lower.includes("restore") || lower.includes("staying calm")) return "restorative gradient, calming spread";
  if (lower.includes("ignite") || lower.includes("overwhelm")) return "intensity gradient, pull or push";
  if (lower.includes("lean in") || lower.includes("step back")) return "proximity gradient, approach or retreat";
  return null;
}

function metaphorToVisual(phrase: string): string | null {
  const direct = SENSORY_TO_VISUAL[phrase];
  if (direct) return direct;
  const lower = phrase.toLowerCase();
  if (lower.includes("light") || lower.includes("glow")) return "soft luminosity, edge-glow";
  if (lower.includes("water") || lower.includes("still")) return "reflective, minimal motion";
  if (lower.includes("fire") || lower.includes("ember")) return "warm tones, banked intensity";
  if (lower.includes("shadow") || lower.includes("dark")) return "depth, gradient fade";
  if (lower.includes("balance") || lower.includes("level")) return "horizontal equilibrium, symmetry";
  if (lower.includes("flow") || lower.includes("current")) return "fluid curves, directional flow";
  return null;
}

function simpleHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

/** Deterministic pick from array using seed. Returns up to count items, no duplicates. */
function seededPick<T>(arr: readonly T[], seed: string, count: number): T[] {
  if (arr.length === 0 || count <= 0) return [];
  const start = (simpleHash(seed) >>> 0) % arr.length;
  const result: T[] = [];
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    result.push(arr[(start + i) % arr.length]);
  }
  return result;
}

function clampEntropy(e: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(e) ? e : 0.2));
}

/**
 * Build visual-grammar spec from archetype voice + seeded phrase selection.
 * Fixed spine (from voice contract) + controlled variability (from phrase banks).
 */
export function buildArchetypeVisualVoiceSpec(
  archetype: LigsArchetype,
  options: BuildArchetypeVisualVoiceOptions
): string {
  const { mode } = options;
  const entropy = clampEntropy(options.entropy ?? 0.2);
  const seed = options.seed ?? `${archetype}-${mode}`;

  const anchor = getArchetypeVoiceAnchorShape(archetype);
  const bank = getArchetypePhraseBank(archetype);

  const lines: string[] = [];

  // Fixed visual spine (from voice contract)
  const tempMap = { low: "muted palette, soft gradients", medium: "balanced saturation", high: "vibrant, saturated tones" } as const;
  lines.push(`• Temperature: ${tempMap[anchor.emotional_temperature]}`);

  const assertMap = { low: "soft edges, gentle contrast", medium: "moderate weight", high: "bold contrast, strong focal" } as const;
  lines.push(`• Assertiveness: ${assertMap[anchor.assertiveness]}`);

  const metaMap = { low: "simple geometric forms", medium: "suggestive layers", high: "layered, metaphorical depth" } as const;
  lines.push(`• Metaphor density: ${metaMap[anchor.metaphor_density]}`);

  const structMap = { lists: "grid-like rhythm, even spacing", declarative: "centered focal, clear hierarchy", narrative: "flowing curves, directional", mixed: "balanced composition" } as const;
  lines.push(`• Structure: ${structMap[anchor.structure_preference]}`);

  if (anchor.rhythm) {
    const r = anchor.rhythm.toLowerCase();
    if (r.includes("smooth") || r.includes("balanced")) lines.push("• Rhythm: even spacing, smooth transitions");
    else if (r.includes("energetic") || r.includes("dynamic")) lines.push("• Rhythm: dynamic flow, directional momentum");
    else if (r.includes("measured")) lines.push("• Rhythm: measured intervals, regular cadence");
  }

  if (anchor.lexicon_bias.length > 0) {
    const keywords = anchor.lexicon_bias.slice(0, 3).join(", ");
    lines.push(`• Lexicon cues: ${keywords}`);
  }

  // Seeded variability: number of atoms scales with entropy
  const numSensory = entropy < 0.3 ? 1 : entropy < 0.7 ? 2 : 3;
  const numOther = entropy >= 0.5 ? 1 : 0;

  const sensoryPicks = seededPick(bank.sensoryMetaphors, seed + "-sensory", numSensory);
  const sensoryVisuals = sensoryPicks
    .map((m) => metaphorToVisual(m))
    .filter((v): v is string => v != null);
  if (sensoryVisuals.length > 0) {
    lines.push(`• Sensory: ${sensoryVisuals.join("; ")}`);
  }

  if (numOther > 0 && mode !== "exemplar") {
    const behavioralPicks = seededPick(bank.behavioralTells, seed + "-behavioral", 1);
    const relationalPicks = seededPick(bank.relationalTells, seed + "-relational", 1);
    const extra: string[] = [];
    for (const p of behavioralPicks) {
      const v = behavioralToVisual(p);
      if (v) extra.push(v);
    }
    for (const p of relationalPicks) {
      const v = relationalToVisual(p);
      if (v) extra.push(v);
    }
    if (extra.length > 0) {
      lines.push(`• Field: ${extra.join("; ")}`);
    }
  }

  return lines.join("\n").slice(0, 800);
}
