/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DO NOT EDIT — ARCHETYPE_CONTRACT_MAP is canonical
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file is a thin re-export. ARCHETYPE_CONTRACT_MAP in contract.ts is the
 * single source of truth. Edit src/ligs/archetypes/contract.ts only.
 *
 * Derivation: adapters.ts → getVoiceAnchorRecord()
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LigsArchetype } from "../schema";
import { getVoiceAnchorRecord } from "@/src/ligs/archetypes/adapters";

export interface ArchetypeAnchor {
  emotional_temperature: "low" | "medium" | "high";
  rhythm: string;
  lexicon_bias: string[];
  metaphor_density: "low" | "medium" | "high";
  assertiveness: "low" | "medium" | "high";
  structure_preference: "lists" | "declarative" | "narrative" | "mixed";
  notes: string;
}

export const ARCHETYPE_ANCHORS: Record<LigsArchetype, ArchetypeAnchor> =
  getVoiceAnchorRecord();

export function getArchetypeAnchor(archetype: LigsArchetype): ArchetypeAnchor {
  return ARCHETYPE_ANCHORS[archetype];
}
