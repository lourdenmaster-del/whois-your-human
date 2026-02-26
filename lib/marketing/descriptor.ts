import type { LigsArchetype } from "@/src/ligs/voice/schema";
import type { MarketingDescriptor } from "./types";
import { getMarketingDescriptor as getMarketingDescriptorFromAdapter } from "@/src/ligs/archetypes/adapters";

/**
 * Returns deterministic marketing descriptor for an archetype.
 * Reads from ArchetypeContract via adapters. contrastDelta is passed in so caller controls the marketing-surface lift.
 */
export function getMarketingDescriptor(
  archetype: LigsArchetype | string,
  options?: { contrastDelta?: number }
): MarketingDescriptor {
  const base = getMarketingDescriptorFromAdapter(
    typeof archetype === "string" ? archetype : archetype
  );
  const contrastDelta = Math.max(0, Math.min(1, options?.contrastDelta ?? 0.15));
  return { ...base, contrastDelta };
}
