/**
 * Canonical archetype schema — single source of truth.
 * Supports human-facing explanation and machine-facing behavior profile.
 * Physics/civilization overlays are optional metadata, not core logic.
 */

import type { LigsArchetype } from "@/src/ligs/voice/schema";

export interface CanonicalArchetype {
  id: LigsArchetype;
  /** Display label (same as id; preserved for API symmetry). */
  label: string;
  /** Human-readable descriptors (comma-separated short phrases). */
  humanDescriptors: string;
  /** Robot-executable role label (strict, no metaphors). */
  machineRole: string;
  /** One-line interaction description: what this archetype does in practice. */
  function: string;
  /** How AI should adapt when working with this archetype. */
  aiInstructions: string;
  /** Signals that indicate the archetype is operating well. */
  onStateSignals: readonly string[];
  /** Patterns that indicate drift or failure mode. */
  failureModes: readonly string[];
  /** Actions to correct or reset when drift detected. */
  correctionProtocol: readonly string[];
  /** Optional: physics/civilization overlays. Demoted from core. */
  metadata?: {
    cosmicPhenomenon?: string;
    civilizationalRole?: string;
    structuralFunction?: string;
  };
}

export type CanonicalArchetypeMap = Record<LigsArchetype, CanonicalArchetype>;
