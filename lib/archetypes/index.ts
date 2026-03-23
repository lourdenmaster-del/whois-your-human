/**
 * Canonical archetype layer — single source of truth.
 * Human-facing and robot-facing; drift detection and correction.
 */

export type { CanonicalArchetype, CanonicalArchetypeMap } from "./schema";
export {
  getCanonicalArchetype,
  getNeutralCanonical,
  CANONICAL_ARCHETYPES,
  CANONICAL_ARCHETYPE_MAP,
} from "./data";
export {
  formatForHuman,
  formatForRobot,
  formatInteractionProfile,
  renderHumanAsText,
  renderRobotAsJson,
  type HumanOutput,
  type InteractionProfile,
  type RobotOutput,
} from "./formatters";
export {
  detectVariance,
  classifyDrift,
  suggestCorrection,
  analyzeDrift,
  fallbackToNeutral,
  type DriftSeverity,
  type DriftResult,
} from "./drift";
export {
  buildBehaviorProfile,
  buildBehaviorInstructions,
  applyDriftAwareBehavior,
  type ArchetypeRuntimeProfile,
} from "./runtime";
