"use client";

import ContinuePrompt from "./ContinuePrompt";

/**
 * Artifact reveal — calm, inevitable. No ceremony.
 * When base is identity share card: show it as-is. No archetype overlay.
 * When base is raw field: show image with optional archetype label.
 * Exported for use in ReportDocument (dossier layout).
 * variant: "terminal" (default) = dark frame; "document" = light border, charcoal caption for dossier.
 */
export function ArtifactReveal({
  imageSrc,
  baselineImage,
  lightSignatureImage,
  finalArtifactImage,
  archetypeImagePath,
  useArcFamilyOverlay = false,
  displayName,
  humanExpression,
  variant = "terminal",
}) {
  const baseImage = finalArtifactImage ?? lightSignatureImage ?? baselineImage ?? imageSrc;
  const isShareCardBase = Boolean(finalArtifactImage && baseImage === finalArtifactImage);
  const showArchetypeOverlay = !isShareCardBase && archetypeImagePath;
  const showLabel = !isShareCardBase && displayName;
  const isDocument = variant === "document";

  return (
    <div className={isDocument ? "my-6 flex flex-col items-start gap-2" : "my-4 flex flex-col items-start gap-3"}>
      <div
        className={`relative max-w-[280px] sm:max-w-[320px] w-full rounded overflow-hidden min-h-[200px] report-artifact-frame ${isDocument ? "whois-document-artifact-frame" : ""}`}
        style={
          isDocument
            ? {
                border: "1px solid rgba(0,0,0,0.18)",
                backgroundColor: "rgba(255,255,255,0.6)",
              }
            : {
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                backgroundColor: "rgba(22,22,26,0.96)",
              }
        }
      >
        {baseImage && (
          <img
            src={baseImage}
            alt="Identity artifact"
            className={`w-full h-full block min-h-[200px] report-artifact-img ${isShareCardBase ? "object-contain" : "object-cover"}`}
          />
        )}
        {showArchetypeOverlay && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 5 }}
          >
            <img
              src={archetypeImagePath}
              alt=""
              aria-hidden
              className={useArcFamilyOverlay ? "archetype-arc-family-overlay" : "archetype-static-image-overlay"}
            />
          </div>
        )}
        {showLabel && (
          <div
            className="absolute bottom-0 left-0 right-0 px-3 py-2 flex flex-col items-center justify-center pointer-events-none"
            style={{
              background: isDocument
                ? "linear-gradient(to top, rgba(250,250,248,0.92) 0%, transparent 100%)"
                : "linear-gradient(to top, rgba(13,11,16,0.9) 0%, transparent 100%)",
              zIndex: 10,
            }}
          >
            <span
              className="text-[10px] font-mono uppercase tracking-[0.2em]"
              style={{ color: isDocument ? "rgba(0,0,0,0.6)" : "#9a9aa0" }}
            >
              ARCHETYPE
            </span>
            <span
              className="text-[12px] font-semibold tracking-[0.08em] uppercase mt-0.5"
              style={{
                fontFamily: "var(--font-beauty-serif), Georgia, serif",
                color: isDocument ? "#1a1a1a" : "white",
              }}
            >
              {displayName}
            </span>
            {humanExpression && humanExpression !== "—" && (
              <span
                className="text-[10px] mt-0.5"
                style={{ color: isDocument ? "rgba(0,0,0,0.65)" : "#c8c8cc" }}
              >
                {humanExpression}
              </span>
            )}
          </div>
        )}
      </div>
      <p
        className={`text-sm text-left max-w-[280px] ${isDocument ? "text-black/60 font-mono" : ""}`}
        style={isDocument ? {} : { color: "#9a9aa0" }}
      >
        Identity artifact resolved.
      </p>
    </div>
  );
}

/**
 * Single step — protocol segment. Same aperture rhythm.
 */
export default function ReportStep({
  step,
  showContinue = true,
  onContinue,
  isLast = false,
  continueRef,
}) {
  const {
    title,
    lines = [],
    hasImage = false,
    imageSrc,
    baselineImage,
    lightSignatureImage,
    finalArtifactImage,
    archetypeImagePath,
    useArcFamilyOverlay = false,
    displayName,
    humanExpression,
  } = step;

  const hasArtifactAssets =
    hasImage &&
    (imageSrc || baselineImage || lightSignatureImage || finalArtifactImage || archetypeImagePath);

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.15em]" style={{ color: "#9a9aa0" }}>
        {title}
      </div>
      {lines.length > 0 && (
        <div className="space-y-1">
          {lines.map((line, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed whitespace-pre-wrap break-words"
              style={{ color: "rgba(200,200,204,0.95)" }}
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
          archetypeImagePath={archetypeImagePath}
          useArcFamilyOverlay={useArcFamilyOverlay}
          displayName={displayName}
          humanExpression={humanExpression}
        />
      )}
      {showContinue && onContinue && !isLast && (
        <div className="pt-2 mt-2 border-t border-white/[0.06]">
          <ContinuePrompt
            ref={continueRef}
            onContinue={onContinue}
            ariaLabel="Press Enter or tap to continue"
          />
        </div>
      )}
    </div>
  );
}
