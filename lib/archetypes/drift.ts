/**
 * Drift detection and correction — operational, deterministic.
 * Detects variance between expected archetype behavior and observed signals.
 * Suggests correction from canonical correctionProtocol.
 */

import { getCanonicalArchetype, getNeutralCanonical } from "./data";
import type { CanonicalArchetype } from "./schema";

export type DriftSeverity = "none" | "mild" | "moderate" | "severe";

export interface DriftResult {
  variance: boolean;
  severity: DriftSeverity;
  matchedFailureModes: string[];
  matchedOnStateSignals: string[];
  suggestedCorrections: string[];
}

/** Normalize string for comparison: lowercase, collapse whitespace. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Check if observed phrase overlaps with a reference (word-level or substring). */
function overlaps(observed: string, reference: string): boolean {
  const o = normalize(observed);
  const r = normalize(reference);
  if (o.length < 3 || r.length < 3) return false;
  const oWords = new Set(o.split(/\s+/).filter((w) => w.length > 2));
  const rWords = r.split(/\s+/).filter((w) => w.length > 2);
  const matchCount = rWords.filter((w) => oWords.has(w) || o.includes(w)).length;
  return matchCount >= Math.min(2, Math.ceil(rWords.length * 0.4));
}

/**
 * Detect variance between baseline archetype and observed signals.
 * Observed signals are strings (e.g. from user input, agent observation, or extracted keywords).
 */
export function detectVariance(
  baselineArchetype: string,
  observedSignals: readonly string[]
): Omit<DriftResult, "severity" | "suggestedCorrections"> {
  const canon = getCanonicalArchetype(baselineArchetype);
  const matchedFailure: string[] = [];
  const matchedOnState: string[] = [];

  for (const obs of observedSignals) {
    if (!obs || typeof obs !== "string") continue;
    for (const fm of canon.failureModes) {
      if (overlaps(obs, fm) && !matchedFailure.includes(fm)) {
        matchedFailure.push(fm);
      }
    }
    for (const os of canon.onStateSignals) {
      if (overlaps(obs, os) && !matchedOnState.includes(os)) {
        matchedOnState.push(os);
      }
    }
  }

  const variance = matchedFailure.length > 0;
  return {
    variance,
    matchedFailureModes: matchedFailure,
    matchedOnStateSignals: matchedOnState,
  };
}

/** Classify drift severity from detection result. */
export function classifyDrift(
  partial: Pick<DriftResult, "variance" | "matchedFailureModes" | "matchedOnStateSignals">
): DriftSeverity {
  if (!partial.variance || partial.matchedFailureModes.length === 0) {
    return "none";
  }
  const failureCount = partial.matchedFailureModes.length;
  const onStateCount = partial.matchedOnStateSignals.length;
  if (failureCount >= 3) return "severe";
  if (failureCount >= 2 || (failureCount >= 1 && onStateCount === 0)) return "moderate";
  return "mild";
}

/** Suggest corrections from canonical correction protocol. */
export function suggestCorrection(
  archetype: string | CanonicalArchetype,
  driftSeverity: DriftSeverity
): string[] {
  const canon =
    typeof archetype === "string" ? getCanonicalArchetype(archetype) : archetype;
  if (driftSeverity === "none") return [];
  const n = driftSeverity === "severe" ? 3 : driftSeverity === "moderate" ? 2 : 1;
  return [...canon.correctionProtocol].slice(0, n);
}

/**
 * Full drift analysis: detect, classify, suggest.
 */
export function analyzeDrift(
  baselineArchetype: string,
  observedSignals: readonly string[]
): DriftResult {
  const partial = detectVariance(baselineArchetype, observedSignals);
  const severity = classifyDrift(partial);
  const suggestedCorrections = suggestCorrection(baselineArchetype, severity);
  return {
    ...partial,
    severity,
    suggestedCorrections,
  };
}

/** Return neutral canonical mapping when archetype is unknown or invalid. */
export function fallbackToNeutral(): CanonicalArchetype {
  return getNeutralCanonical();
}
