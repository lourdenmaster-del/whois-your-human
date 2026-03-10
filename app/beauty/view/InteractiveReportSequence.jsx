"use client";

/**
 * Report sequence — same aperture law as /origin and preview.
 * One protocol state at a time. No terminal chrome. No scrollable box.
 * WHOIS record unfolding.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getReportSections } from "@/lib/report-sections";
import ReportStep from "./ReportStep";

const PROMPT_DELAY_MS = 700;

export default function InteractiveReportSequence({ profile }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [promptReady, setPromptReady] = useState(false);
  const continueRef = useRef(null);

  const steps = profile ? getReportSections(profile) : [];
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStep?.isLast ?? false;

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

  useEffect(() => {
    if (!promptReady || isLastStep) return;
    const id = requestAnimationFrame(() => continueRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [promptReady, isLastStep]);

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 whois-origin" style={{ background: "#000" }}>
        <p className="font-mono text-sm" style={{ color: "rgba(154,154,160,0.9)", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
          Loading registry record…
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden whois-origin"
      style={{ background: "#000", position: "relative" }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)",
          animation: "whois-field-pulse 10s ease-in-out infinite",
        }}
      />

      <div
        className="whois-aperture w-full max-w-[min(100vw-2rem,1000px)] min-w-0 mx-auto"
        style={{ position: "relative", zIndex: 1 }}
      >
        <div
          className="whois-aperture-inner w-full font-mono text-sm sm:text-base min-h-[120px] flex flex-col justify-end py-4 px-4 sm:px-5"
          style={{
            color: "rgba(154,154,160,0.9)",
            fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
            lineHeight: 1.9,
          }}
        >
          {currentStep && (
            <ReportStep
              step={currentStep}
              showContinue={promptReady}
              onContinue={handleContinue}
              isLast={isLastStep}
              continueRef={continueRef}
            />
          )}
        </div>
      </div>

      <p className="mt-6 text-[9px] font-mono uppercase tracking-[0.12em] text-left" style={{ color: "rgba(122,122,128,0.4)" }}>
        Human WHOIS protocol
      </p>
      <div className="protocol-nav mt-2 flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-left">
        <Link href="/origin" className="text-[11px] font-mono text-[#9a9aa0] hover:text-[#c8c8cc] hover:underline">
          ← Return to Origin
        </Link>
        <Link href="/dossier" className="text-[11px] font-mono text-[#9a9aa0] hover:text-[#c8c8cc] hover:underline">
          View Dossier
        </Link>
      </div>
    </div>
  );
}
