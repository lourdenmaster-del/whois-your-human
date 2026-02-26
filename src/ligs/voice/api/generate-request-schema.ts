import { z } from "zod";
import { safeParseVoiceProfile, ChannelEnum } from "../schema";

const ConstraintsSchema = z
  .object({
    maxWords: z.number().int().min(1).max(2000).optional(),
    includeKeywords: z.array(z.string().min(1)).optional(),
    excludeKeywords: z.array(z.string().min(1)).optional(),
  })
  .optional();

export const GenerateVoiceRequestSchema = z
  .object({
    profile: z.unknown(),
    task: z.string().min(10, "task must be at least 10 characters").max(5000),
    channel: ChannelEnum.optional(),
    constraints: ConstraintsSchema,
    minScore: z.number().min(0).max(100).default(80),
  })
  .strict(); // Reject unknown keys (e.g. allowExternalWrites)

export type GenerateVoiceRequest = z.infer<typeof GenerateVoiceRequestSchema>;

export function parseGenerateVoiceRequest(input: unknown) {
  const structure = GenerateVoiceRequestSchema.safeParse(input);
  if (!structure.success) {
    return structure;
  }
  const profileResult = safeParseVoiceProfile(structure.data.profile);
  if (!profileResult.success) {
    return {
      success: false as const,
      error: {
        issues: profileResult.error.issues,
        message: profileResult.error.message,
      },
    };
  }
  return {
    success: true as const,
    data: {
      ...structure.data,
      profile: profileResult.data,
    },
  };
}
