import { z } from "zod";
import { LigsArchetypeEnum } from "@/src/ligs/voice/schema";

export const MarketingGenerateRequestSchema = z
  .object({
    primary_archetype: LigsArchetypeEnum,
    variationKey: z.string().max(200).optional(),
    contrastDelta: z.number().min(0).max(1).optional(),
    /** Client-provided UUID per click; prevents duplicate OpenAI spend. */
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();

export type MarketingGenerateRequest = z.infer<
  typeof MarketingGenerateRequestSchema
>;

export function parseMarketingGenerateRequest(
  input: unknown
): { success: true; data: MarketingGenerateRequest } | { success: false; error: string; issues?: unknown[] } {
  const result = MarketingGenerateRequestSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: "MARKETING_REQUEST_INVALID",
      issues: result.error.issues,
    };
  }
  return { success: true, data: result.data };
}
