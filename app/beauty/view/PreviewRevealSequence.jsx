"use client";

/**
 * Top-loaded exemplar reveal sequence. Profile-driven, one continuous terminal-led flow.
 * Fixed cinematic scene: one text slot, one hero window, one bottom prompt.
 * Direct continuation of /origin: same terminal shell, same vibe.
 * 5-phase flow: archetype image carousel → archetype expression → final artifact.
 * Phase 2 uses ArchetypeResolveCarousel (cycle → resolve); no glyph logic.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getArchetypePreviewConfig, buildPlaceholderSvg } from "@/lib/archetype-preview-config";
import ArchetypeResolveCarousel from "@/components/ArchetypeResolveCarousel";
import ContinuePrompt from "./ContinuePrompt";

/** Phase delays (ms). Phase 2 driven by carousel onResolve, not timer. Phase 5 awaits continue. */
const PHASE_DELAYS_MS = {
  1: 1200,
  3: 4000,
  4: 1000,
  5: 4000,
};

const PHASE_TEXT = {
  1: "Resolving archetype signature...",
  2: "Archetype signature identified.",
  3: "This is a visual representation of how your archetype expresses.",
  4: "Sample share card ready for inspection...",
  5: "LIGHT IDENTITY ARTIFACT — RESOLVED",
};

function getTeaserForArchetype(archetype) {
  const config = getArchetypePreviewConfig(archetype);
  return config.teaser ?? { humanExpression: "—", civilizationFunction: "—", archetypalVoice: "—", environments: "—" };
}

export default function PreviewRevealSequence({ profile, onComplete }) {
  const arch = profile?.dominantArchetype ?? "Ignispectrum";
  const isLocked = !!profile?.isLockedPreview;
  const config = getArchetypePreviewConfig(arch);
  const archetypeImagePath = config.hasArchetypeVisual ? config.archetypeStaticImagePath : null;
  const displayName = config.displayName ?? "ARCHETYPE";
  const vectorZeroImage = profile?.imageUrls?.[0];
  const lightSignatureImage = profile?.imageUrls?.[1];
  const finalArtifactImage = profile?.imageUrls?.[2];

  /** Best archetype field visual for phase 3. */
  const archetypeFieldImage =
    vectorZeroImage ??
    lightSignatureImage ??
    config.sampleArtifactUrl ??
    buildPlaceholderSvg(displayName);

  /** Final artifact for phase 5: share_card (has logo, archetype overlay, label) or lightSignature as base. Prefer imageUrls[2]. */
  const finalArtifactBase =
    finalArtifactImage ??
    lightSignatureImage ??
    vectorZeroImage ??
    config.sampleArtifactUrl ??
    buildPlaceholderSvg(displayName);

  const [phase, setPhase] = useState(1);
  const [awaitContinue, setAwaitContinue] = useState(false);
  const continueRef = useRef(null);

  // Phase advance: phase 2 is driven by carousel onResolve, others by timer.
  useEffect(() => {
    if (phase >= 5) {
      setAwaitContinue(true);
      return;
    }
    if (phase === 2) return; // Carousel drives phase 2 → 3
    const delay = PHASE_DELAYS_MS[phase] ?? 1500;
    const t = setTimeout(() => setPhase((p) => Math.min(p + 1, 5)), delay);
    return () => clearTimeout(t);
  }, [phase]);

  const handleCarouselResolve = useCallback(() => setPhase(3), []);

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

  const currentText = PHASE_TEXT[phase] ?? PHASE_TEXT[5];
  const teaser = getTeaserForArchetype(arch);

  /** Phase 1: hero fades dark→white. Phase 2: white. Phase 3–4: dark. Phase 5: dark. */
  const heroIsWhite = phase === 2;
  const heroFadingToWhite = phase === 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b] overflow-x-hidden">
      <div className="w-full max-w-2xl min-w-0">
        <div
          className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden"
          style={{
            boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="px-4 py-2.5 border-b border-[#2a2a2e] flex items-center gap-2"
            style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a4a4e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a4a4e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a4a4e]" />
            <span className="ml-2 text-[10px] uppercase tracking-widest font-mono" style={{ color: "#a8a8b0" }}>
              (L)IGS Human WHOIS Resolution Engine
            </span>
          </div>

          <div
            className="flex flex-col min-h-[min(70vh,480px)] px-4 sm:px-5 py-4 font-mono text-[14px] sm:text-base"
            style={{
              color: "#c8c8cc",
              fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', monospace",
              lineHeight: 1.7,
            }}
          >
            {/* Fixed text slot — one burst per phase */}
            <div className="min-h-[2.5rem] flex items-center py-2">
              <p className="whitespace-pre-wrap break-words" style={{ color: "#9a9aa0" }}>
                {currentText}
              </p>
            </div>

            {/* Fixed hero window — same position, content changes by phase */}
            <div className="flex-1 flex items-center justify-center py-4 min-h-[200px]">
              <div
                className={`preview-hero-window relative max-w-[200px] w-full rounded border border-[#2a2a2e] overflow-hidden min-h-[180px] ${
                  heroFadingToWhite ? "preview-hero-fade-to-white" : ""
                } ${heroIsWhite ? "preview-hero-white" : ""}`}
              >
                {/* Phase 1: empty, fading to white */}
                {phase === 1 && <div className="absolute inset-0" aria-hidden />}

                {/* Phase 2: archetype image carousel — cycle then resolve to final archetype */}
                {phase === 2 && (
                  <div className="absolute inset-0 preview-archetype-on-white">
                    <ArchetypeResolveCarousel
                      finalArchetype={arch}
                      onResolve={handleCarouselResolve}
                      finalImageUrl={arch === "Ignispectrum" ? profile?.imageUrls?.[2] : undefined}
                    />
                  </div>
                )}

                {/* Phase 3: archetype field image, fade in → zoom → settle → fade out */}
                {phase === 3 && (
                  <div className="absolute inset-0 preview-archetype-image-sequence">
                    <img
                      src={archetypeFieldImage}
                      alt=""
                      aria-hidden
                      className="w-full h-full object-cover block min-h-[180px]"
                    />
                    {isLocked && (
                      <div
                        className="locked-blur-overlay"
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          width: "72%",
                          height: "44%",
                          maxWidth: "95%",
                          maxHeight: "95%",
                          borderRadius: "9999px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 10,
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                          background: "rgba(0,0,0,0.18)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        <span
                          className="text-xs sm:text-sm font-medium tracking-widest uppercase"
                          style={{ color: "rgba(255,255,255,0.9)", letterSpacing: "0.2em" }}
                        >
                          Unlocking
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Phase 4: clear / empty */}
                {phase === 4 && <div className="absolute inset-0" aria-hidden />}

                {/* Phase 5: final artifact — base image + archetype overlay + label (same as ReportStep artifact look) */}
                {phase === 5 && (
                  <div className="absolute inset-0 preview-final-artifact-reveal">
                    <img
                      src={finalArtifactBase}
                      alt="Light Identity Artifact"
                      className="w-full h-full object-cover block min-h-[180px]"
                    />
                    {archetypeImagePath && !isLocked && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ zIndex: 20 }}
                      >
                        <img src={archetypeImagePath} alt="" aria-hidden className="archetype-static-image-overlay" />
                      </div>
                    )}
                    {isLocked && (
                      <div
                        className="locked-blur-overlay"
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          width: "72%",
                          height: "44%",
                          maxWidth: "95%",
                          maxHeight: "95%",
                          borderRadius: "9999px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 15,
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                          background: "rgba(0,0,0,0.18)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        <span
                          className="text-xs sm:text-sm font-medium tracking-widest uppercase"
                          style={{ color: "rgba(255,255,255,0.9)", letterSpacing: "0.2em" }}
                        >
                          Unlocking
                        </span>
                      </div>
                    )}
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
                      <span
                        className="text-[12px] font-semibold tracking-[0.08em] uppercase text-white mt-0.5"
                        style={{ fontFamily: "var(--font-beauty-serif), Georgia, serif" }}
                      >
                        {displayName}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Civilization function teaser — directly under artifact, registry-style. Only when phase 5 resolved. */}
            {awaitContinue && phase === 5 && (
              <>
                <div
                  className="mt-3 pt-3 border-t border-[#2a2a2e]/40 space-y-1.5"
                  style={{
                    fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', monospace",
                    fontSize: "11px",
                    lineHeight: 1.6,
                    color: "#c8c8cc",
                  }}
                >
                  <div>
                    <span style={{ color: "#9a9aa0", textTransform: "uppercase", letterSpacing: "0.12em" }}>ARCHETYPE</span>
                    <div style={{ color: "#c8c8cc", marginTop: "2px" }}>{displayName}</div>
                  </div>
                  {teaser?.humanExpression && teaser.humanExpression !== "—" && (
                    <div>
                      <span style={{ color: "#9a9aa0", textTransform: "uppercase", letterSpacing: "0.12em" }}>HUMAN EXPRESSION</span>
                      <div style={{ color: "#c8c8cc", marginTop: "2px" }}>{teaser.humanExpression}</div>
                    </div>
                  )}
                  {teaser?.civilizationFunction && teaser.civilizationFunction !== "—" && (
                    <div>
                      <span style={{ color: "#9a9aa0", textTransform: "uppercase", letterSpacing: "0.12em" }}>CIVILIZATION FUNCTION</span>
                      <div style={{ color: "#c8c8cc", marginTop: "2px" }}>{teaser.civilizationFunction}</div>
                    </div>
                  )}
                  {teaser?.archetypalVoice && teaser.archetypalVoice !== "—" && (
                    <div>
                      <span style={{ color: "#9a9aa0", textTransform: "uppercase", letterSpacing: "0.12em" }}>COMMUNICATION SIGNATURE</span>
                      <div style={{ color: "#c8c8cc", marginTop: "2px" }}>{teaser.archetypalVoice}</div>
                    </div>
                  )}
                  {teaser?.environments && teaser.environments !== "—" && (
                    <div>
                      <span style={{ color: "#9a9aa0", textTransform: "uppercase", letterSpacing: "0.12em" }}>COMMON HUMAN ENVIRONMENTS</span>
                      <div style={{ color: "#c8c8cc", marginTop: "2px" }}>{teaser.environments}</div>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-[#2a2a2e]/40 mt-3">
                <p
                  className="text-sm mb-1"
                  style={{ color: "#9a9aa0", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
                >
                  Press ENTER or tap to continue
                </p>
                <ContinuePrompt
                  ref={continueRef}
                  onContinue={onComplete}
                  ariaLabel="Press Enter or tap to continue"
                />
              </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#2a2a2e]/80 space-y-2">
          <p className="text-center">
            <Link
              href="/origin"
              className="registry-ctrl text-[11px] font-medium text-[#9a9aa0] hover:text-[#7A4FFF] hover:underline touch-manipulation"
            >
              ← Return to Origin
            </Link>
          </p>
          <p
            className="text-center text-[10px] uppercase tracking-widest font-mono"
            style={{ fontFamily: "inherit", color: "#8a8a90" }}
          >
            (L)IGS — Human WHOIS Resolution Engine
          </p>
        </div>
      </div>
    </div>
  );
}
