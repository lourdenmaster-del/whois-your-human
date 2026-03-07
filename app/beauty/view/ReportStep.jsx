"use client";

import { useState, useEffect, useMemo } from "react";
import ContinuePrompt from "./ContinuePrompt";

/** Stage delay (ms) between each resolution stage. */
const STAGE_DELAY_MS = 900;

/**
 * Five-stage artifact resolution sequence. One identity artifact resolving into coherence.
 * Stage 1: Resolving archetype... (status line, faint container)
 * Stage 2: Glyph emphasis + copy (skip if no glyph)
 * Stage 3: Baseline image + copy (skip if no baseline)
 * Stage 4: Light Signature image + copy (skip if no lightSig)
 * Stage 5: Final artifact + glyph overlay + label + completion
 */
function ArtifactReveal({
  imageSrc,
  baselineImage,
  lightSignatureImage,
  finalArtifactImage,
  glyphPath,
  displayName,
}) {
  const enabledStages = useMemo(() => {
    const stages = [1];
    if (glyphPath) stages.push(2);
    if (baselineImage) stages.push(3);
    if (lightSignatureImage) stages.push(4);
    stages.push(5);
    return stages;
  }, [glyphPath, baselineImage, lightSignatureImage]);

  const [stageIndex, setStageIndex] = useState(0);
  const currentStage = enabledStages[stageIndex] ?? enabledStages[enabledStages.length - 1];

  useEffect(() => {
    if (stageIndex >= enabledStages.length - 1) return;
    const t = setTimeout(() => setStageIndex((i) => Math.min(i + 1, enabledStages.length - 1)), STAGE_DELAY_MS);
    return () => clearTimeout(t);
  }, [stageIndex, enabledStages.length]);

  const finalImage = finalArtifactImage ?? lightSignatureImage ?? baselineImage ?? imageSrc;
  const showImage = currentStage >= 3;
  const imageSrcForStage =
    currentStage === 3
      ? baselineImage ?? lightSignatureImage ?? finalArtifactImage ?? imageSrc
      : currentStage === 4
        ? lightSignatureImage ?? baselineImage ?? finalArtifactImage ?? imageSrc
        : finalImage;

  const stageCopy = {
    1: "Resolving archetype...",
    2: "This symbol represents the physics that most reflects you.",
    3: "This is how your physics expresses in nature.",
    4: "This is your Light Signature — the light environment imprinted upon you at birth.",
    5: "LIGHT IDENTITY ARTIFACT COMPLETE",
  };

  const copy = currentStage === 1 ? null : stageCopy[currentStage];
  const showGlyphOnly = currentStage === 2 && glyphPath;
  const showGlyphOverlay = currentStage === 5 && glyphPath;
  const showLabel = currentStage === 5 && displayName;

  return (
    <div className="my-4 flex flex-col items-center gap-3">
      <div
        className={`relative max-w-[200px] w-full rounded border border-[#2a2a2e] overflow-hidden bg-[#0d0d0f] artifact-resolution-frame min-h-[120px] ${
          currentStage === 1 ? "artifact-resolution-faint" : ""
        }`}
      >
        {currentStage === 1 ? (
          <div className="absolute inset-0 flex items-center justify-center px-3">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#6a6a70]">
              Resolving archetype...
            </p>
          </div>
        ) : showGlyphOnly ? (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none artifact-reveal-layer artifact-reveal-visible"
            style={{ zIndex: 5 }}
          >
            <img src={glyphPath} alt="" aria-hidden className="archetype-glyph-overlay artifact-resolution-glyph-solo" />
          </div>
        ) : (
          <>
            {showImage && imageSrcForStage && (
              <img
                key={currentStage}
                src={imageSrcForStage}
                alt="Identity artifact"
                className="w-full h-full object-cover block artifact-reveal-layer artifact-reveal-visible min-h-[120px]"
              />
            )}
            {showGlyphOverlay && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none artifact-reveal-layer artifact-reveal-visible"
                style={{ zIndex: 20 }}
              >
                <img src={glyphPath} alt="" aria-hidden className="archetype-glyph-overlay" />
              </div>
            )}
            {showLabel && (
              <div
                className="absolute bottom-0 left-0 right-0 px-3 py-2 flex flex-col items-center justify-center pointer-events-none artifact-reveal-layer artifact-reveal-visible"
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
                  {displayName}
                </span>
              </div>
            )}
          </>
        )}
      </div>
      {copy && (
        <p
          className="text-sm leading-relaxed text-center max-w-[280px] artifact-reveal-layer artifact-reveal-visible"
          style={{ color: currentStage === 5 ? "#9a9aa0" : "#c8c8cc" }}
        >
          {copy}
        </p>
      )}
    </div>
  );
}

/**
 * Single step in the interactive report sequence.
 * Renders title, body lines, optional image/glyph, and continue prompt.
 * Accepts step object from buildIgnisSteps.
 */
export default function ReportStep({
  step,
  showContinue = true,
  onContinue,
  isLast = false,
}) {
  const {
    title,
    lines = [],
    hasImage = false,
    imageSrc,
    baselineImage,
    lightSignatureImage,
    finalArtifactImage,
    glyphPath,
    displayName,
  } = step;

  const hasArtifactAssets =
    hasImage &&
    (imageSrc || baselineImage || lightSignatureImage || finalArtifactImage || glyphPath);

  return (
    <div className="space-y-3 mb-6 last:mb-0">
      <h2
        className="registry-label text-[10px] font-mono uppercase tracking-[0.2em]"
        style={{ color: "#9a9aa0" }}
      >
        {title}
      </h2>
      {lines.length > 0 && (
        <div className="space-y-1">
          {lines.map((line, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed whitespace-pre-wrap break-words"
              style={{ color: "#c8c8cc" }}
            >
              {line}
            </p>
          ))}
        </div>
      )}
      {hasArtifactAssets && (
        <ArtifactReveal
          imageSrc={imageSrc}
          baselineImage={baselineImage}
          lightSignatureImage={lightSignatureImage}
          finalArtifactImage={finalArtifactImage}
          glyphPath={glyphPath}
          displayName={displayName}
        />
      )}
      {showContinue && onContinue && !isLast && (
        <>
          <p className="text-sm mt-4" style={{ color: "#9a9aa0", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
            Press ENTER or tap to continue
          </p>
          <ContinuePrompt
            onContinue={onContinue}
            ariaLabel="Press Enter or tap to continue"
          />
        </>
      )}
    </div>
  );
}
