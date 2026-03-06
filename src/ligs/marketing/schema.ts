import { z } from "zod";

const CopySchema = z.object({
  headline: z.string().max(60),
  subhead: z.string().max(140).optional(),
  cta: z.string().max(24).optional(),
});

const BoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

const PlacementSchema = z.object({
  safeArea: BoxSchema,
  logo: z.object({
    anchor: z.enum(["br"]),
    paddingPct: z.number().min(0).max(0.1),
    maxWidthPct: z.number().min(0.1).max(0.3),
  }),
  textBlock: z.object({
    box: BoxSchema,
    align: z.enum(["center"]),
  }),
  ctaChip: z
    .object({
      box: BoxSchema,
      align: z.enum(["center"]),
    })
    .optional(),
});

const LogoStyleSchema = z.object({
  text: z.string().default("(L)"),
  weight: z.enum(["400", "600", "700"]).default("600"),
  tracking: z.number().min(-0.1).max(0.2).default(0),
  opacity: z.number().min(0).max(1).default(1),
  blur: z.number().min(0).max(4).default(0),
  glow: z.number().min(0).max(20).default(0),
  radius: z.number().min(0.1).max(0.5).default(0.48),
  fill: z.string().default("#ffffff"),
  stroke: z.string().optional(),
  strokeWidth: z.number().min(0).default(0),
  circleFill: z.string().default("rgba(0,0,0,0.7)"),
  circleStroke: z.string().default("rgba(255,255,255,0.3)"),
});

const StyleTokensSchema = z.object({
  spacing: z.enum(["balanced", "airy"]).default("balanced"),
  emojiPolicy: z.enum(["none", "rare"]).default("none"),
  exclamationPolicy: z.enum(["none", "rare"]).default("rare"),
  typography: z.object({
    headlineSize: z.enum(["xl", "lg"]).default("lg"),
    subheadSize: z.enum(["md", "sm"]).default("sm"),
    weight: z.enum(["regular", "semibold"]).default("regular"),
  }),
  logoStyle: LogoStyleSchema.optional(),
});

const ConstraintsSchema = z.object({
  bannedWords: z.array(z.string().min(1)).default([]),
  noMedicalClaims: z.boolean().default(true),
  noGuarantees: z.boolean().default(true),
});

export const MarketingOverlaySpecSchema = z.object({
  id: z.string().min(1),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "version must be semver like 1.0.0"),
  created_at: z.string().datetime(),

  templateId: z.literal("square_card_v1"),

  output: z.object({
    aspectRatio: z.literal("1:1"),
    size: z.enum(["1024", "1536"]).default("1024"),
  }),

  copy: CopySchema,

  placement: PlacementSchema,

  styleTokens: StyleTokensSchema,

  constraints: ConstraintsSchema,

  /** "brand" = (L) monogram; "archetype" = archetype glyph (e.g. Ignis glyph). */
  markType: z.enum(["brand", "archetype"]).default("brand"),
  /** When markType=archetype, which archetype glyph to use (e.g. "Ignispectrum"). */
  markArchetype: z.string().optional(),
});

export type MarketingOverlaySpec = z.infer<typeof MarketingOverlaySpecSchema>;
export type LogoStyle = z.infer<typeof LogoStyleSchema>;
export type TemplateId = "square_card_v1";
export type AspectRatio = "1:1";

const DEFAULT_LOGO_STYLE: LogoStyle = LogoStyleSchema.parse({});

/** Returns logo style with defaults; safe when spec.styleTokens.logoStyle is undefined. */
export function getLogoStyleWithDefaults(
  logoStyle: MarketingOverlaySpec["styleTokens"]["logoStyle"]
): LogoStyle {
  return logoStyle ? { ...DEFAULT_LOGO_STYLE, ...logoStyle } : DEFAULT_LOGO_STYLE;
}

export function parseMarketingOverlaySpec(input: unknown): MarketingOverlaySpec {
  return MarketingOverlaySpecSchema.parse(input);
}

export function safeParseMarketingOverlaySpec(input: unknown) {
  return MarketingOverlaySpecSchema.safeParse(input);
}
