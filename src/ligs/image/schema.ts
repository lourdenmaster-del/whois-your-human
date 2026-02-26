import { z } from "zod";
import { LigsArchetypeEnum } from "../voice/schema";

const LigsImageSchema = z.object({
  primary_archetype: LigsArchetypeEnum,
  secondary_archetype: LigsArchetypeEnum.nullable().default(null),
  blend_weights: z.record(z.string(), z.number().min(0).max(1)).default({}),
});

const StyleSchema = z.object({
  mood: z.string().min(1).max(100),
  palette: z.array(z.string().min(1)).max(20),
  materials: z.array(z.string().min(1)).max(20),
  lighting: z.string().min(1).max(50),
  texture_level: z.enum(["low", "medium", "high"]).default("low"),
  contrast_level: z.enum(["low", "medium", "high"]).default("medium"),
});

const CompositionSchema = z.object({
  layout: z.string().min(1).max(50),
  symmetry: z.enum(["low", "medium", "high"]).default("medium"),
  negative_space: z.enum(["low", "medium", "high"]).default("medium"),
  focal_behavior: z.string().min(1).max(50),
  flow_lines: z.enum(["none", "subtle", "present"]).default("subtle"),
});

const ConstraintsSchema = z.object({
  no_text: z.literal(true),
  no_logos: z.literal(true),
  no_faces: z.literal(true),
  no_figures: z.literal(true),
  no_symbols: z.literal(true),
  no_astrology: z.literal(true),
  avoid_busy_textures: z.literal(true),
  safety_notes: z.array(z.string().min(1)).max(20).optional(),
});

const OutputSchema = z.object({
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:5"]).default("1:1"),
  size: z.enum(["1024", "1536"]).default("1024"),
  count: z.number().int().min(1).max(4).default(1),
});

const PromptSchema = z.object({
  positive: z.string().min(1),
  negative: z.string().min(1),
});

const VariationSchema = z.object({
  variationId: z.string().min(1),
  motifs: z.array(z.string().min(1)).max(20),
  randomnessLevel: z.number().min(0).max(1),
});

export const ImagePromptSpecSchema = z.object({
  id: z.string().min(1),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "version must be semver like 1.0.0"),
  created_at: z.string().datetime(),

  ligs: LigsImageSchema,

  purpose: z.string().min(1).max(100),

  style: StyleSchema,

  composition: CompositionSchema,

  constraints: ConstraintsSchema,

  output: OutputSchema,

  prompt: PromptSchema,

  variation: VariationSchema,
});

export type ImagePromptSpec = z.infer<typeof ImagePromptSpecSchema>;

export function parseImagePromptSpec(input: unknown): ImagePromptSpec {
  return ImagePromptSpecSchema.parse(input);
}

export function safeParseImagePromptSpec(input: unknown) {
  return ImagePromptSpecSchema.safeParse(input);
}
