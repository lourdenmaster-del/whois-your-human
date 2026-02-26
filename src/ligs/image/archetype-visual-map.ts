/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DO NOT EDIT — ARCHETYPE_CONTRACT_MAP is canonical
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file is a thin re-export. ARCHETYPE_CONTRACT_MAP in contract.ts is the
 * single source of truth. Edit src/ligs/archetypes/contract.ts only.
 *
 * Derivation: adapters.ts → getVisualMapRecord()
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LigsArchetype } from "../voice/schema";
import { getVisualMapRecord } from "@/src/ligs/archetypes/adapters";

export type TextureLevel = "low" | "medium" | "high";
export type ContrastLevel = "low" | "medium" | "high";
export type SymmetryLevel = "low" | "medium" | "high";
export type FlowLines = "none" | "subtle" | "present";

export interface ArchetypeVisualParams {
  mood: string;
  palette: string[];
  materials: string[];
  lighting: string;
  texture_level: TextureLevel;
  contrast_level: ContrastLevel;
  layout: string;
  symmetry: SymmetryLevel;
  negative_space: SymmetryLevel;
  focal_behavior: string;
  flow_lines: FlowLines;
  /** Optional abstract physical cues for marketing modes (from contract.visual). */
  abstractPhysicalCues?: string;
}

export const ARCHETYPE_VISUAL_MAP: Record<LigsArchetype, ArchetypeVisualParams> =
  getVisualMapRecord();
