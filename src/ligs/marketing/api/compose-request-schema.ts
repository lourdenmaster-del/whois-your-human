import { z } from "zod";
import type { VoiceProfile } from "../../voice/schema";
import { safeParseVoiceProfile } from "../../voice/schema";
import { MarketingOverlaySpecSchema } from "../schema";

const BackgroundSchema = z
  .object({
    url: z.string().url().optional(),
    b64: z.string().min(1).optional(),
  })
  .refine((v) => v.url != null || v.b64 != null, {
    message: "Either url or b64 required",
  });

export const ComposeRequestSchema = z
  .object({
    profile: z.unknown(),
    background: BackgroundSchema,
    purpose: z.string().min(3).max(100),
    templateId: z.literal("square_card_v1").default("square_card_v1"),
    output: z.object({ size: z.enum(["1024", "1536"]).default("1024") }).default({ size: "1024" }),
    variationKey: z.string().max(200).optional(),
    overlaySpec: MarketingOverlaySpecSchema.optional(),
  })
  .strict();

export interface ComposeParseResult {
  success: true;
  data: {
    profile: VoiceProfile;
    background: { url?: string; b64?: string };
    purpose: string;
    templateId: "square_card_v1";
    output: { size: "1024" | "1536" };
    variationKey?: string;
    overlaySpec?: z.infer<typeof MarketingOverlaySpecSchema>;
  };
}

export interface ComposeParseError {
  success: false;
  errorType: "COMPOSE_REQUEST_INVALID" | "VOICE_PROFILE_INVALID";
  message: string;
  issues?: unknown[];
}

export function parseComposeRequest(input: unknown): ComposeParseResult | ComposeParseError {
  const structure = ComposeRequestSchema.safeParse(input);
  if (!structure.success) {
    return {
      success: false,
      errorType: "COMPOSE_REQUEST_INVALID",
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
      background: structure.data.background,
      purpose: structure.data.purpose,
      templateId: structure.data.templateId,
      output: structure.data.output,
      variationKey: structure.data.variationKey,
      overlaySpec: structure.data.overlaySpec,
    },
  };
}
