import { z } from "zod";

export const LigsArchetypeEnum = z.enum([
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
]);

export const ChannelEnum = z.enum([
  "website",
  "email",
  "social_caption",
  "longform",
  "ads",
]);

export const VoiceCadenceSchema = z.object({
  sentence_length: z.object({
    target_words: z.number().int().min(3).max(60),
    range: z
      .tuple([z.number().int().min(1), z.number().int().min(1)])
      .refine(
        ([min, max]) => min <= max,
        "cadence.sentence_length.range must be [min,max] with min <= max"
      ),
  }),
  paragraph_length: z.object({
    target_sentences: z.number().int().min(1).max(12),
    range: z
      .tuple([z.number().int().min(1), z.number().int().min(1)])
      .refine(
        ([min, max]) => min <= max,
        "cadence.paragraph_length.range must be [min,max] with min <= max"
      ),
  }),
  rhythm_notes: z.string().min(0).max(500).optional(),
});

export const LexiconSchema = z.object({
  preferred_words: z.array(z.string().min(1)).max(200).default([]),
  avoid_words: z.array(z.string().min(1)).max(200).default([]),
  banned_words: z.array(z.string().min(1)).max(200).default([]),
});

export const FormattingSchema = z.object({
  emoji_policy: z.enum(["none", "rare", "allowed"]).default("none"),
  exclamation_policy: z.enum(["none", "rare", "allowed"]).default("rare"),
  capitalization: z
    .enum(["standard", "lowercase", "uppercase"])
    .default("standard"),
  bullets: z.enum(["disallowed", "allowed"]).default("allowed"),
  headline_style: z.string().min(0).max(200).default("clean minimal"),
});

export const ClaimsPolicySchema = z.object({
  medical_claims: z
    .enum(["prohibited", "allowed_with_disclaimer"])
    .default("prohibited"),
  before_after_promises: z
    .enum(["prohibited", "allowed_with_proof"])
    .default("prohibited"),
  substantiation_required: z.boolean().default(true),
  allowed_phrasing: z.array(z.string().min(1)).max(100).default([]),
});

export const ChannelAdapterSchema = z.object({
  tone_shift: z.string().min(0).max(200).default(""),
  structure: z.array(z.string().min(1)).max(30).default([]),
});

const LigsSchema = z
  .object({
    primary_archetype: LigsArchetypeEnum,
    secondary_archetype: LigsArchetypeEnum.nullable().default(null),
    blend_weights: z
      .record(z.string(), z.number().min(0).max(1))
      .default({}),
  })
  .refine(
    (v) => {
      const weights = Object.values(v.blend_weights ?? {});
      const sum = weights.reduce((a, b) => a + b, 0);
      return sum <= 1.000001;
    },
    "ligs.blend_weights must sum to <= 1.0"
  );

export const VoiceProfileSchema = z.object({
  id: z.string().min(1),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "version must be semver like 1.0.0"),
  created_at: z.string().datetime(),
  owner_user_id: z.string().min(1),

  brand: z.object({
    name: z.string().min(1),
    products: z.array(z.string().min(1)).max(200).default([]),
    audience: z.string().min(0).max(300).default(""),
  }),

  ligs: LigsSchema,

  descriptors: z.array(z.string().min(1)).min(3).max(24),

  cadence: VoiceCadenceSchema,

  lexicon: LexiconSchema,

  formatting: FormattingSchema,

  claims_policy: ClaimsPolicySchema,

  channel_adapters: z
    .record(z.string(), ChannelAdapterSchema)
    .default({}),

  examples: z
    .object({
      do: z.array(z.string().min(1)).max(50).default([]),
      dont: z.array(z.string().min(1)).max(50).default([]),
    })
    .default({ do: [], dont: [] }),
});

export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;
export type LigsArchetype = z.infer<typeof LigsArchetypeEnum>;
export type Channel = z.infer<typeof ChannelEnum>;

export function parseVoiceProfile(input: unknown): VoiceProfile {
  return VoiceProfileSchema.parse(input);
}

export function safeParseVoiceProfile(input: unknown) {
  return VoiceProfileSchema.safeParse(input);
}
