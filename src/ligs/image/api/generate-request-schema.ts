import { z } from "zod";
import type { VoiceProfile } from "../../voice/schema";
import { safeParseVoiceProfile, LigsArchetypeEnum } from "../../voice/schema";

const ImageSchema = z.object({
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:5"]).default("1:1"),
  size: z.enum(["1024", "1536"]).default("1024"),
  count: z.number().int().min(1).max(4).default(1),
});

export const GenerateImageRequestSchema = z
  .object({
    profile: z.unknown(),
    purpose: z.string().min(3).max(100),
    image: ImageSchema,
    variationKey: z.string().max(200).optional(),
    archetype: LigsArchetypeEnum.optional(),
    /** Client-provided UUID per click; prevents duplicate OpenAI spend. */
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();

export type GenerateImageRequest = z.infer<typeof GenerateImageRequestSchema>;

type ImageInfer = {
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:5";
  size: "1024" | "1536";
  count: number;
};

export interface ParseResult {
  success: true;
  data: {
    profile: VoiceProfile;
    purpose: string;
    image: ImageInfer;
    variationKey?: string;
    archetype?: z.infer<typeof LigsArchetypeEnum>;
    idempotencyKey?: string;
  };
}

export interface ParseError {
  success: false;
  errorType: "IMAGE_REQUEST_INVALID" | "VOICE_PROFILE_INVALID";
  message: string;
  issues?: unknown[];
}

export function parseGenerateImageRequest(input: unknown): ParseResult | ParseError {
  const structure = GenerateImageRequestSchema.safeParse(input);
  if (!structure.success) {
    return {
      success: false,
      errorType: "IMAGE_REQUEST_INVALID",
      message: structure.error.message,
      issues: structure.error.issues,
    };
  }

  const profileResult = safeParseVoiceProfile(structure.data.profile);
  if (!profileResult.success) {
    return {
      success: false,
      errorType: "VOICE_PROFILE_INVALID",
      message: "Voice profile validation failed",
      issues: profileResult.error.issues,
    };
  }

  return {
    success: true,
    data: {
      profile: profileResult.data,
      purpose: structure.data.purpose,
      image: structure.data.image,
      variationKey: structure.data.variationKey,
      archetype: structure.data.archetype,
      idempotencyKey: structure.data.idempotencyKey,
    },
  };
}
