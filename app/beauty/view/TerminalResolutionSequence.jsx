"use client";

/**
 * Terminal-style resolution sequence for /beauty/view.
 * Continuation of /origin: uses saved intake to resolve solar season + archetype locally,
 * shows timed lines, then waits for user to press ENTER or tap to continue.
 * No API calls. Same black/white terminal look as /origin.
 *
 * Reuses: getOriginIntake, approximateSunLongitudeFromDate, getPrimaryArchetypeFromSolarLongitude,
 * SOLAR_SEASONS, getMarketingDescriptor, getCosmicAnalogue, getArchetypePhraseBank.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getOriginIntake } from "@/lib/landing-storage";
import { approximateSunLongitudeFromDate } from "@/lib/terminal-intake/approximateSunLongitude";
import { getPrimaryArchetypeFromSolarLongitude } from "@/src/ligs/image/triangulatePrompt";
import { SOLAR_SEASONS } from "@/src/ligs/astronomy/solarSeason";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import { getArchetypePhraseBank } from "@/src/ligs/voice/archetypePhraseBank";
import { getArchetypePreviewConfig, buildPlaceholderSvg } from "@/lib/archetype-preview-config";
import ContinuePrompt from "./ContinuePrompt";

const FALLBACK_ARCHETYPE = "Ignispectrum";

const RESOLUTION_LINES = [
  "(L)IGS SYSTEM CONTINUING SESSION",
  "",
  "Retrieving local environment metadata...",
  "Completed.",
  "",
  "Retrieving cosmic metadata...",
  "Completed.",
  "",
  "Resolving solar season...",
  "Completed.",
  "",
  "Resolving archetype...",
  "Completed.",
];

/** Staggered delays (ms) before each resolution line. Action→[think]→Completed→[breathe]→next. */
const RESOLUTION_DELAYS_MS = [
  0,     // (L)IGS SYSTEM CONTINUING SESSION — immediate
  300,   // "" — quick
  400,   // Retrieving local environment metadata...
  1000,  // Completed. — thinking pause (lightweight step)
  400,   // "" — breathe
  150,   // Retrieving cosmic metadata...
  1600,  // Completed. — thinking pause (cosmic = weightiest)
  450,   // "" — breathe
  150,   // Resolving solar season...
  1400,  // Completed. — thinking pause
  500,   // "" — breathe
  150,   // Resolving archetype...
  1900,  // Completed. — thinking pause (key step, longest dwell)
];


/**
 * Compose 3–5 archetype-specific terminal lines from existing repo content.
 * Uses: descriptor (hitPoints), cosmic analogue, phrase bank. No new content.
 */
function composeArchetypeSnippetLines(archetype) {
  const descriptor = getMarketingDescriptor(archetype);
  const cosmic = getCosmicAnalogue(archetype);
  let phraseBank;
  try {
    phraseBank = getArchetypePhraseBank(archetype);
  } catch {
    phraseBank = null;
  }

  const hit0 = descriptor?.hitPoints?.[0] ?? "their light expression";
  const phenomenon = cosmic?.phenomenon ?? "";
  const sensory = phraseBank?.sensoryMetaphors?.[0];
  const behavioral = phraseBank?.behavioralTells?.[0];

  const lines = [];
  lines.push(`${archetype} identities are known for ${hit0}.`);
  if (phenomenon) lines.push(`Their light expression resembles ${phenomenon}.`);
  if (sensory) lines.push(sensory);
  if (behavioral && lines.length < 5) lines.push(behavioral);

  return lines.slice(0, 5);
}

export default function TerminalResolutionSequence({ onComplete }) {
  const [lines, setLines] = useState([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [phase, setPhase] = useState("resolution"); // resolution | content | await_continue
  const [resolved, setResolved] = useState(null);
  const [contentDone, setContentDone] = useState(false);
  const scrollRef = useRef(null);
  const continueRef = useRef(null);

  const addLine = useCallback((text, type = "system") => {
    setLines((prev) => [...prev, { text, type }]);
  }, []);

  const scrollToBottom = useCallback(() => {
    queueMicrotask(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
    });
  }, []);

  const handleContinue = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  // Resolve archetype from intake or fallback
  useEffect(() => {
    const intake = getOriginIntake();
    let archetype = FALLBACK_ARCHETYPE;
    let sunLonDeg = null;
    let seasonLabel = "";

    if (intake?.birthDate) {
      sunLonDeg = approximateSunLongitudeFromDate(intake.birthDate);
      if (sunLonDeg != null) {
        archetype = getPrimaryArchetypeFromSolarLongitude(sunLonDeg);
        const seasonIndex = Math.min(Math.floor(sunLonDeg / 30), 11);
        const entry = SOLAR_SEASONS[seasonIndex];
        seasonLabel = entry ? `${entry.archetype} (${entry.anchorType})` : archetype;
      }
    }
    if (!seasonLabel) {
      const entry = SOLAR_SEASONS.find((s) => s.archetype === archetype);
      seasonLabel = entry ? `${entry.archetype} (${entry.anchorType})` : archetype;
    }

    setResolved({
      archetype,
      sunLonDeg,
      seasonLabel,
      intake,
    });
  }, []);

  // Phase 1: resolution lines — staggered timing: quick for metadata, longer for cosmic/archetype
  useEffect(() => {
    if (phase !== "resolution" || lineIndex >= RESOLUTION_LINES.length) return;
    const delay = RESOLUTION_DELAYS_MS[lineIndex] ?? 500;
    const t = setTimeout(() => {
      addLine(RESOLUTION_LINES[lineIndex]);
      setLineIndex((i) => i + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [phase, lineIndex, addLine]);

  // Transition to content phase: personal resolution + archetype snippet
  useEffect(() => {
    if (phase !== "resolution" || lineIndex < RESOLUTION_LINES.length || !resolved || contentDone) return;
    setContentDone(true);

    const { archetype, seasonLabel } = resolved;
    const snippetLines = composeArchetypeSnippetLines(archetype);

    const introLines = [
      "",
      `Your cosmic metadata begins in ${seasonLabel}.`,
      `This resolves into ${archetype}.`,
      "",
      ...snippetLines,
    ];

    /** Staggered delays (ms) per content line: quick → medium → long (reveal) → varied snippet → beat before prompt. */
    const snippetDelays = [600, 500, 550, 500, 500];
    const contentDelays = [
      700,   // "" — breathe after final Completed. before reveal
      700,   // Your cosmic metadata begins...
      1100,  // This resolves into... (reveal — longer)
      350,   // ""
      ...snippetLines.map((_, i) => snippetDelays[i] ?? 500),
      450,   // ""
      700,   // Sample identity artifacts available.
      400,   // ""
      500,   // Press ENTER... + short beat before prompt
    ];

    let delay = 0;
    introLines.forEach((text, i) => {
      delay += contentDelays[i] ?? 500;
      setTimeout(() => addLine(text), delay);
    });
    delay += contentDelays[introLines.length] ?? 450;
    setTimeout(() => {
      addLine("");
      addLine("Sample identity artifacts available.");
      addLine("");
      addLine("Press ENTER or tap to continue.");
      setPhase("await_continue");
    }, delay);
  }, [phase, lineIndex, resolved, contentDone, addLine]);

  // Focus continue prompt when awaiting; document keydown fallback so Enter works even if focus fails
  useEffect(() => {
    if (phase !== "await_continue") return;
    const id = requestAnimationFrame(() => continueRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "await_continue") return;
    const onKeyDown = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target?.closest?.("a[href]")) return;
      e.preventDefault();
      onComplete?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, onComplete]);

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
            ref={scrollRef}
            className="h-[min(70vh,480px)] overflow-x-hidden overflow-y-auto px-4 sm:px-5 py-4 font-mono text-[14px] sm:text-base"
            style={{
              color: "#c8c8cc",
              fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', monospace",
              lineHeight: 1.7,
            }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                className="whitespace-pre-wrap break-words"
                style={{
                  color: line.type === "user" ? "#e8e8ec" : "#9a9aa0",
                }}
              >
                {line.type === "user" ? "> " : ""}
                {line.text}
              </div>
            ))}

            {phase === "await_continue" && resolved && (() => {
              const config = getArchetypePreviewConfig(resolved.archetype);
              const thumbnailSrc = config.sampleArtifactUrl || buildPlaceholderSvg(config.displayName);
              return (
                <div className="my-4 flex justify-start">
                  <div className="relative max-w-[200px] rounded border border-[#2a2a2e] overflow-hidden bg-[#0d0d0f]">
                    <img
                      src={thumbnailSrc}
                      alt="Sample identity artifact"
                      className="w-full h-full object-cover block"
                    />
                    {config.hasArchetypeVisual && (
                      <img
                        src={config.archetypeStaticImagePath}
                        alt=""
                        aria-hidden
                        className="archetype-static-image-overlay"
                      />
                    )}
                    <div
                      className="absolute bottom-0 left-0 right-0 px-3 py-2 flex flex-col items-center justify-center pointer-events-none"
                      style={{
                        background: "linear-gradient(to top, rgba(13,11,16,0.9) 0%, transparent 100%)",
                        zIndex: 10,
                      }}
                    >
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#9a9aa0]">
                        ARCHETYPE
                      </span>
                      <span
                        className="text-[12px] font-semibold tracking-[0.08em] uppercase text-white mt-0.5"
                        style={{ fontFamily: "var(--font-beauty-serif), Georgia, serif" }}
                      >
                        {config.displayName}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {phase === "await_continue" && (
              <ContinuePrompt
                ref={continueRef}
                onContinue={handleContinue}
                ariaLabel="Press Enter or tap to continue"
              />
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#2a2a2e]/80 space-y-2 text-left">
          <p>
            <Link
              href="/origin"
              className="registry-ctrl text-[11px] font-medium text-[#9a9aa0] hover:text-[#c8c8cc] hover:underline touch-manipulation"
            >
              ← Return to Origin
            </Link>
          </p>
          <p>
            <Link
              href="/dossier"
              className="text-[11px] font-mono text-[#9a9aa0] hover:text-[#c8c8cc] hover:underline touch-manipulation"
            >
              View sample record
            </Link>
          </p>
          <p
            className="text-[10px] uppercase tracking-widest font-mono"
            style={{ fontFamily: "inherit", color: "#8a8a90" }}
          >
            (L)IGS — Human WHOIS Resolution Engine
          </p>
        </div>
      </div>
    </div>
  );
}
