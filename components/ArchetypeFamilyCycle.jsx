"use client";

/**
 * Cycles through an archetype's arc image family (1–12), then lands on the deterministic pick.
 * Settle requires BOTH: (1) one full visible pass completed, (2) current image is the chosen one.
 * Used after ArchetypeResolveCarousel: same aperture, protocol feel.
 * Same reportId + archetype → same final image.
 */

import { useState, useEffect, useRef } from "react";
import {
  getArchetypeFamilyUrlsForPreview,
  pickArchetypeFamilyImage,
} from "@/lib/archetype-public-assets";

const FAMILY_CONFIG = {
  cycleDurationStartMs: 360,
  cycleDurationEndMs: 500,
  resolveHoldMs: 900,
};

function getCycleDelayMs(index, total, startMs, endMs) {
  if (total <= 1) return startMs;
  const t = index / Math.max(1, total - 1);
  return Math.round(startMs + t * (endMs - startMs));
}

export default function ArchetypeFamilyCycle({
  archetype,
  reportId = "",
  onResolve,
  className = "",
}) {
  const urls = getArchetypeFamilyUrlsForPreview(archetype);
  const finalUrl = pickArchetypeFamilyImage(archetype, reportId);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("cycle");
  const fullCycleCompleteRef = useRef(false);

  useEffect(() => {
    if (urls.length === 0) {
      onResolve?.();
      return;
    }
    if (phase === "cycle") {
      const atLastImage = index >= urls.length - 1;
      const currentUrl = urls[index];
      const isOnChosenImage = currentUrl === finalUrl;
      const delay = getCycleDelayMs(
        index,
        urls.length,
        FAMILY_CONFIG.cycleDurationStartMs,
        FAMILY_CONFIG.cycleDurationEndMs
      );
      const t = setTimeout(() => {
        if (atLastImage) {
          fullCycleCompleteRef.current = true;
          if (isOnChosenImage) {
            setPhase("resolve_hold");
          } else {
            setIndex(0);
          }
        } else {
          if (fullCycleCompleteRef.current && isOnChosenImage) {
            setPhase("resolve_hold");
          } else {
            setIndex((i) => i + 1);
          }
        }
      }, delay);
      return () => clearTimeout(t);
    }
    if (phase === "resolve_hold") {
      const t = setTimeout(() => onResolve?.(), FAMILY_CONFIG.resolveHoldMs);
      return () => clearTimeout(t);
    }
  }, [phase, index, urls.length, finalUrl, onResolve]);

  const displayUrl =
    phase === "resolve_hold" && finalUrl ? finalUrl : urls[index] ?? urls[0];

  if (!displayUrl) return null;

  return (
    <div
      className={`archetype-family-cycle absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}
      aria-hidden
    >
      <img
        src={displayUrl}
        alt=""
        className={`archetype-family-cycle-img ${
          phase === "resolve_hold" ? "archetype-family-settled" : ""
        }`}
      />
    </div>
  );
}
