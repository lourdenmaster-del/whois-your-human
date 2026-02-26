/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DO NOT EDIT — ARCHETYPE_CONTRACT_MAP is canonical
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file is a thin re-export. ARCHETYPE_CONTRACT_MAP in contract.ts is the
 * single source of truth. Edit src/ligs/archetypes/contract.ts only.
 *
 * Derivation: adapters.ts → getOverlayCopyRecord()
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LigsArchetype } from "../voice/schema";
import { getOverlayCopyRecord } from "@/src/ligs/archetypes/adapters";

export interface ArchetypeCopyPhrases {
  headlines: string[];
  subheads: string[];
  ctas: string[];
  disclaimers: string[];
}

/**
 * Archetype-appropriate copy phrase banks.
 * Stabiliora: calm, no hype; Ignispectrum: energetic; etc.
 */
export const ARCHETYPE_COPY_PHRASES: Record<LigsArchetype, ArchetypeCopyPhrases> =
  getOverlayCopyRecord();
