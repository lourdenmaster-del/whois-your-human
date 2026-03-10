"use client";

/**
 * Preview reveal sequence — same aperture law as /origin landing.
 * Centered, wide, shallow. One or two protocol lines. No terminal chrome.
 * Flow: init → 12-archetype cycle → archetype family cycle → final artifact → continue.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getArchetypePreviewConfig, buildPlaceholderSvg } from "@/lib/archetype-preview-config";
import ArchetypeResolveCarousel from "@/components/ArchetypeResolveCarousel";
import ArchetypeFamilyCycle from "@/components/ArchetypeFamilyCycle";
import ContinuePrompt from "./ContinuePrompt";
import FlowNav from "@/components/FlowNav";
import {
  getArchetypeFamilyUrlsForPreview,
  pickArchetypeFamilyImage,
} from "@/lib/archetype-public-assets";

const PHASE_DELAYS_MS = {
  1: 1200,
  4: 1000,
  5: 4000,
};

const PROTOCOL_LINES = {
  1: "Resolving archetype signature...",
  2: "Scanning class registry...",
  "2b": "Class identified.",
  3: "Scanning sample registry...",
  "3b": "Representative selected.",
  4: "Sample share card ready...",
  5: "LIGHT IDENTITY ARTIFACT — RESOLVED",
};

export default function PreviewRevealSequence({ profile, reportId = "", onComplete }) {
  const arch = profile?.dominantArchetype ?? "Ignispectrum";
  const isLocked = !!profile?.isLockedPreview;
  const config = getArchetypePreviewConfig(arch);
  const archetypeImagePath = config.hasArchetypeVisual ? config.archetypeStaticImagePath : null;
  const chosenArcImage =
    getArchetypeFamilyUrlsForPreview(arch).length > 0
      ? pickArchetypeFamilyImage(arch, profile?.reportId ?? reportId)
      : null;
  const overlayImage = chosenArcImage ?? archetypeImagePath;
  const displayName = config.displayName ?? "ARCHETYPE";
  const vectorZeroImage = profile?.imageUrls?.[0];
  const lightSignatureImage = profile?.imageUrls?.[1];
  const finalArtifactImage = profile?.imageUrls?.[2];

  const hasFamilyImages = getArchetypeFamilyUrlsForPreview(arch).length > 0;

  const finalArtifactBase =
    finalArtifactImage ??
    lightSignatureImage ??
    vectorZeroImage ??
    config.sampleArtifactUrl ??
    buildPlaceholderSvg(displayName);

  const [phase, setPhase] = useState(1);
  const [carouselSettled, setCarouselSettled] = useState(false);
  const [awaitContinue, setAwaitContinue] = useState(false);
  const continueRef = useRef(null);

  // Protocol line: one at a time. Phase 2 uses 2a→2b; phase 3 uses 3a→3b when family exists.
  const protocolLine =
    phase === 2 && carouselSettled
      ? `${PROTOCOL_LINES["2b"]} ${displayName}`
      : phase === 3 && !hasFamilyImages
        ? PROTOCOL_LINES["3b"]
        : phase === 3
          ? null // Family cycle drives its own lines via phase 3/3b
          : PROTOCOL_LINES[phase] ?? PROTOCOL_LINES[5];

  const [familyPhase, setFamilyPhase] = useState("scan"); // scan | resolved
  const familyProtocolLine =
    phase === 3 && hasFamilyImages
      ? familyPhase === "resolved"
        ? PROTOCOL_LINES["3b"]
        : PROTOCOL_LINES["3"]
      : null;

  const displayProtocolLine = familyProtocolLine ?? protocolLine ?? PROTOCOL_LINES[1];

  useEffect(() => {
    if (phase >= 5) {
      setAwaitContinue(true);
      return;
    }
    if (phase === 2 || phase === 3) return;
    const delay = PHASE_DELAYS_MS[phase] ?? 1500;
    const t = setTimeout(() => setPhase((p) => Math.min(p + 1, 5)), delay);
    return () => clearTimeout(t);
  }, [phase]);

  const handleCarouselResolve = useCallback(() => {
    setCarouselSettled(true);
    setPhase(3);
  }, []);

  const handleCarouselSettle = useCallback(() => setCarouselSettled(true), []);

  const familyResolveTimerRef = useRef(null);
  const handleFamilyResolve = useCallback(() => {
    setFamilyPhase("resolved");
    familyResolveTimerRef.current = setTimeout(() => setPhase(4), 800);
  }, []);

  useEffect(() => {
    return () => {
      if (familyResolveTimerRef.current) clearTimeout(familyResolveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === 3 && !hasFamilyImages) {
      const t = setTimeout(() => setPhase(4), 1200);
      return () => clearTimeout(t);
    }
  }, [phase, hasFamilyImages]);

  useEffect(() => {
    if (!awaitContinue) return;
    const id = requestAnimationFrame(() => continueRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [awaitContinue]);

  useEffect(() => {
    if (!awaitContinue) return;
    const onKeyDown = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target?.closest?.("a[href]")) return;
      e.preventDefault();
      onComplete?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [awaitContinue, onComplete]);

  const heroIsWhite = phase === 2 || (phase === 3 && hasFamilyImages);
  const heroFadingToWhite = phase === 1;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden whois-origin"
      style={{ background: "#000", position: "relative" }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)",
          animation: "whois-field-pulse 10s ease-in-out infinite",
        }}
      />

      <div
        className="whois-aperture w-full max-w-[min(100vw-2rem,1000px)] min-w-0 mx-auto"
        style={{ position: "relative", zIndex: 1 }}
      >
        <div className="whois-aperture-inner w-full font-mono text-sm sm:text-base min-h-[120px] flex flex-col justify-end py-4 px-4 sm:px-5">
          <div
            style={{
              color: "rgba(154,154,160,0.9)",
              fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
              lineHeight: 1.9,
            }}
          >
            <div className="whitespace-pre-wrap break-words min-h-[2.2em]">
              {displayProtocolLine}
            </div>

            {/* Hero: same aperture feel — shallow, left-aligned, content by phase */}
            <div className="flex items-start justify-start py-6 min-h-[180px]">
              <div
                className={`relative w-full max-w-[min(90%,380px)] rounded border border-white/[0.08] overflow-hidden min-h-[160px] ${
                  heroFadingToWhite ? "preview-hero-fade-to-white" : ""
                } ${heroIsWhite ? "preview-hero-white" : ""}`}
                style={{
                  backgroundColor: heroIsWhite ? "rgba(255,255,255,0.98)" : "rgba(22,22,26,0.96)",
                  boxShadow: heroIsWhite
                    ? "0 0 32px rgba(200,210,220,0.2)"
                    : "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                {phase === 1 && <div className="absolute inset-0" aria-hidden />}

                {phase === 2 && (
                  <div className="absolute inset-0 preview-archetype-on-white">
                    <ArchetypeResolveCarousel
                      finalArchetype={arch}
                      onResolve={handleCarouselResolve}
                      onSettle={handleCarouselSettle}
                      finalImageUrl={arch === "Ignispectrum" ? profile?.imageUrls?.[2] : undefined}
                    />
                  </div>
                )}

                {phase === 3 && hasFamilyImages && (
                  <div className="absolute inset-0 preview-archetype-on-white">
                    <ArchetypeFamilyCycle
                      archetype={arch}
                      reportId={profile?.reportId ?? reportId}
                      onResolve={handleFamilyResolve}
                    />
                  </div>
                )}

                {phase === 4 && <div className="absolute inset-0" aria-hidden />}

                {phase === 5 && (
                  <div className="absolute inset-0 preview-final-artifact-reveal">
                    <img
                      src={finalArtifactBase}
                      alt="Light Identity Artifact"
                      className={`w-full h-full block min-h-[160px] ${finalArtifactImage ? "object-contain" : "object-cover"}`}
                    />
                    {overlayImage && !isLocked && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ zIndex: 20 }}
                      >
                        <img
                          src={overlayImage}
                          alt=""
                          aria-hidden
                          className={chosenArcImage ? "archetype-arc-family-overlay" : "archetype-static-image-overlay"}
                        />
                      </div>
                    )}
                    {isLocked && (
                      <div className="locked-blur-overlay absolute inset-0 flex items-center justify-center z-10 rounded-full" style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", background: "rgba(0,0,0,0.18)" }}>
                        <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.9)", letterSpacing: "0.2em" }}>
                          Unlocking
                        </span>
                      </div>
                    )}
                    {!finalArtifactImage && (
                      <div
                        className="absolute bottom-0 left-0 right-0 px-3 py-2 flex flex-col items-center justify-center pointer-events-none"
                        style={{
                          background: "linear-gradient(to top, rgba(13,11,16,0.9) 0%, transparent 100%)",
                          zIndex: 10,
                        }}
                      >
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "#9a9aa0" }}>
                          ARCHETYPE
                        </span>
                        <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-white mt-0.5" style={{ fontFamily: "var(--font-beauty-serif), Georgia, serif" }}>
                          {displayName}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {awaitContinue && phase === 5 && (
              <div className="pt-2 mt-2">
                <ContinuePrompt
                  ref={continueRef}
                  onContinue={onComplete}
                  ariaLabel="Press Enter or tap to continue"
                />
              </div>
            )}
            <FlowNav variant="dark" className="mt-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
