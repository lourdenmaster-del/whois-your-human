import { z } from "zod";

export const MarketingVisualsRequestSchema = z
  .object({
    primary_archetype: z.string().min(1).max(100),
    variationKey: z.string().max(200).optional(),
    contrastDelta: z.number().min(0).max(1).optional(),
  })
  .strict();

export type MarketingVisualsRequest = z.infer<typeof MarketingVisualsRequestSchema>;
