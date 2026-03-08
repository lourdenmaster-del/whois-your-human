"use client";

/**
 * Interactive report sequence — terminal-continuous, step-by-step reveal.
 * Replaces the dossier for exemplar previews. Stack model: previous steps stay visible.
 *
 * Uses report-composition layer (composeArchetypeSummary, composeLightExpression,
 * composeCosmicTwin, composeReturnToCoherence) for coherent sentences.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getArchetypePreviewConfig, buildPlaceholderSvg } from "@/lib/archetype-preview-config";
import {
  composeArchetypeOpening,
  composeArchetypeSummary,
  composeLightExpression,
  composeCosmicTwin,
  composeReturnToCoherence,
} from "@/lib/report-composition";
import ReportStep from "./ReportStep";

/** Delay (ms) before showing continue prompt. Reuses terminal rhythm: content lands, short beat, then prompt. */
const PROMPT_DELAY_MS = 700;

/**
 * Build 6-step Ignis sequence from profile. Uses report-composition layer for coherent sentences.
 */
function buildIgnisSteps(profile) {
  const arch = profile?.dominantArchetype ?? "Ignispectrum";
  const config = getArchetypePreviewConfig(arch);

  const baselineImage = profile?.imageUrls?.[0];
  const lightSignatureImage = profile?.imageUrls?.[1];
  const finalArtifactImage = profile?.imageUrls?.[2];
  const bestImage = lightSignatureImage ?? baselineImage ?? finalArtifactImage ?? config.sampleArtifactUrl ?? buildPlaceholderSvg(config.displayName);

  const openingLines = composeArchetypeOpening(profile);
  const summaryLines = composeArchetypeSummary(profile);
  const lightLines = composeLightExpression(profile);
  const cosmicLines = composeCosmicTwin(profile);
  const returnLines = composeReturnToCoherence(profile);

  return [
    {
      id: "archetype-resolved",
      title: "ARCHETYPE RESOLVED",
      lines: openingLines,
      hasImage: false,
    },
    {
      id: "archetype-summary",
      title: "ARCHETYPE SUMMARY",
      lines: summaryLines.length > 0 ? summaryLines : [],
      hasImage: false,
    },
    {
      id: "light-expression",
      title: "LIGHT EXPRESSION",
      lines: lightLines,
      hasImage: false,
    },
    {
      id: "cosmic-twin",
      title: "COSMIC TWIN RELATION",
      lines: cosmicLines,
      hasImage: false,
    },
    {
      id: "artifact-reveal",
      title: "ARTIFACT REVEAL",
      lines: ["Sample identity artifact."],
      hasImage: true,
      imageSrc: bestImage,
      baselineImage,
      lightSignatureImage,
      finalArtifactImage,
      archetypeImagePath: config.hasArchetypeVisual ? config.archetypeStaticImagePath : null,
      displayName: config.displayName,
    },
    {
      id: "return-next",
      title: "RETURN TO COHERENCE",
      lines: returnLines,
      hasImage: false,
      isLast: true,
    },
  ];
}

export default function InteractiveReportSequence({ profile }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [promptReady, setPromptReady] = useState(false);
  const scrollRef = useRef(null);

  const steps = profile ? buildIgnisSteps(profile) : [];
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStep?.isLast ?? false;

  const scrollToBottom = useCallback(() => {
    queueMicrotask(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentStepIndex, scrollToBottom]);

  // Delayed continue prompt: content lands first, short beat, then show prompt. Reuses terminal rhythm.
  useEffect(() => {
    setPromptReady(false);
    if (isLastStep) return;
    const t = setTimeout(() => setPromptReady(true), PROMPT_DELAY_MS);
    return () => clearTimeout(t);
  }, [currentStepIndex, isLastStep]);

  const handleContinue = useCallback(() => {
    if (isLastStep) return;
    setCurrentStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [isLastStep, steps.length]);

  const handleContinueRef = useRef(handleContinue);
  handleContinueRef.current = handleContinue;

  // Document-level keydown: Enter/Space work even when ContinuePrompt lacks focus. Do not intercept when link focused.
  useEffect(() => {
    if (!promptReady || isLastStep) return;
    const onKeyDown = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target?.closest?.("a[href]")) return;
      e.preventDefault();
      handleContinueRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [promptReady, isLastStep]);

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
        <p className="font-mono text-sm text-[#9a9aa0]" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
          Loading report…
        </p>
      </div>
    );
  }

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
              (L)IGS Interactive Report Sequence
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
            {steps.slice(0, currentStepIndex + 1).map((step, i) => (
              <ReportStep
                key={step.id}
                step={step}
                showContinue={i === currentStepIndex && promptReady}
                onContinue={handleContinue}
                isLast={step.isLast}
              />
            ))}
          </div>

        </div>

        <div className="mt-4 pt-3 border-t border-[#2a2a2e]/80 space-y-2">
          <p className="text-center">
            <Link
              href="/origin"
              className="registry-ctrl inline-flex items-center justify-center min-h-[44px] text-[11px] font-medium text-[#9a9aa0] hover:text-[#7A4FFF] hover:underline touch-manipulation"
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
