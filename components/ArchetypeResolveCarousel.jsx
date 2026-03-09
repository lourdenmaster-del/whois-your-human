"use client";

/**
 * Archetype image carousel that cycles through archetype visuals, then resolves
 * onto the correct archetype for the user/result. Replaces glyph-based reveal.
 *
 * Used by: PreviewRevealSequence, TerminalResolutionSequence (optional).
 * Central image source: getArchetypeStaticImagePath via lib/archetype-static-images.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { LIGS_ARCHETYPES } from "@/lib/archetypes";
import {
  getArchetypeStaticImagePath,
  getArchetypeStaticImagePathOrFallback,
  ARC_STATIC_FALLBACK,
} from "@/lib/archetype-static-images";

/** Timing (ms). Tune here for carousel feel. Deceleration: faster at start, slower near end. */
const CAROUSEL_CONFIG = {
  /** Duration for first cycle image (faster) */
  cycleDurationStartMs: 380,
  /** Duration for last cycle image before final (slower) */
  cycleDurationEndMs: 580,
  /** Number of archetypes to cycle through before resolve. 11 = one full pass through all 12 (others + final). */
  cycleCount: 11,
  /** Duration of transition when landing on final archetype */
  resolveTransitionMs: 700,
  /** Hold duration on final archetype before considering "resolved" */
  resolveHoldMs: 1400,
};

/** Interpolate cycle duration: index 0 = start, index cycleCount-1 = end. */
function getCycleDelayMs(index, cycleCount, startMs, endMs) {
  if (cycleCount <= 1) return startMs;
  const t = index / Math.max(1, cycleCount - 1);
  return Math.round(startMs + t * (endMs - startMs));
}

/**
 * Build ordered sequence: one full pass through all 12 archetypes, then final.
 * Cycles through all "others" (11 archetypes excluding final), then settles on final.
 * Ensures user perceives a complete scan of the class registry before resolution.
 */
function buildCarouselSequence(finalArchetype, cycleCount) {
  const final = finalArchetype?.trim?.() || "Ignispectrum";
  const others = LIGS_ARCHETYPES.filter((a) => a !== final);
  const n = Math.min(cycleCount, others.length);
  const cycle = others.slice(0, n);
  return [...cycle, final];
}

/**
 * ArchetypeResolveCarousel — cycles archetype images, then resolves to final.
 *
 * @param {string} finalArchetype - The archetype to land on (e.g. profile.dominantArchetype)
 * @param {() => void} onResolve - Called when carousel has resolved and held on final image
 * @param {() => void} onSettle - Optional. Called when final image has visually settled (start of resolve_hold). Use for in-sync terminal copy.
 * @param {string} [className] - Optional wrapper class
 * @param {object} [config] - Override CAROUSEL_CONFIG (cycleDurationMs, cycleCount, resolveHoldMs)
 * @param {string} [finalImageUrl] - Override final resolve image (e.g. share_card; bypasses arc-static poster)
 */
export default function ArchetypeResolveCarousel({
  finalArchetype = "Ignispectrum",
  onResolve,
  onSettle,
  className = "",
  config = {},
  finalImageUrl,
}) {
  const cfg = { ...CAROUSEL_CONFIG, ...config };
  const sequence = buildCarouselSequence(finalArchetype, cfg.cycleCount);
  const [phase, setPhase] = useState("cycle"); // cycle | resolve_transition | resolve_hold
  const [index, setIndex] = useState(0);
  const [currentPath, setCurrentPath] = useState(null);
  const resolvedRef = useRef(false);

  const currentArchetype = sequence[index];
  const finalPath = finalImageUrl ?? getArchetypeStaticImagePathOrFallback(finalArchetype);

  const emitResolve = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResolve?.();
  }, [onResolve]);

  useEffect(() => {
    const path = getArchetypeStaticImagePath(currentArchetype);
    setCurrentPath(path ?? ARC_STATIC_FALLBACK);
  }, [currentArchetype]);

  // Preload archetype images for smooth carousel transitions
  useEffect(() => {
    LIGS_ARCHETYPES.forEach((arch) => {
      const p = getArchetypeStaticImagePath(arch);
      if (p) {
        const img = new Image();
        img.src = p;
      }
    });
  }, []);

  useEffect(() => {
    if (phase === "cycle") {
      if (index >= sequence.length - 1) {
        const pauseBeforeFinal = cfg.resolvePauseBeforeFinalMs ?? 0;
        if (pauseBeforeFinal > 0) {
          const t = setTimeout(() => setPhase("resolve_transition"), pauseBeforeFinal);
          return () => clearTimeout(t);
        }
        setPhase("resolve_transition");
        return;
      }
      const delay = getCycleDelayMs(
        index,
        cfg.cycleCount,
        cfg.cycleDurationStartMs ?? cfg.cycleDurationMs ?? 480,
        cfg.cycleDurationEndMs ?? cfg.cycleDurationStartMs ?? cfg.cycleDurationMs ?? 480
      );
      const t = setTimeout(() => setIndex((i) => i + 1), delay);
      return () => clearTimeout(t);
    }

    if (phase === "resolve_transition") {
      setIndex(sequence.length - 1);
      setCurrentPath(finalPath);
      onSettle?.(); // Terminal copy in sync with final image landing
      const t = setTimeout(() => setPhase("resolve_hold"), cfg.resolveTransitionMs);
      return () => clearTimeout(t);
    }

    if (phase === "resolve_hold") {
      const t = setTimeout(emitResolve, cfg.resolveHoldMs);
      return () => clearTimeout(t);
    }
  }, [phase, index, sequence.length, finalPath, cfg.cycleCount, cfg.cycleDurationStartMs, cfg.cycleDurationEndMs, cfg.cycleDurationMs, cfg.resolvePauseBeforeFinalMs, cfg.resolveTransitionMs, cfg.resolveHoldMs, emitResolve, onSettle]);

  if (!currentPath) return null;

  return (
    <div
      className={`archetype-resolve-carousel absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}
      aria-hidden
    >
      <img
        src={currentPath}
        alt=""
        className={`archetype-resolve-carousel-img ${
          phase === "resolve_transition" || phase === "resolve_hold" ? "archetype-resolve-settled" : ""
        }`}
      />
    </div>
  );
}

export { CAROUSEL_CONFIG, buildCarouselSequence, getCycleDelayMs };
