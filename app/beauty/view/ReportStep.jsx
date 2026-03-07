"use client";

import ContinuePrompt from "./ContinuePrompt";

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
    glyphPath,
    displayName,
  } = step;

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
      {hasImage && imageSrc && (
        <div className="my-4 flex justify-center">
          <div className="relative max-w-[200px] w-full rounded border border-[#2a2a2e] overflow-hidden bg-[#0d0d0f]">
            <img
              src={imageSrc}
              alt="Sample identity artifact"
              className="w-full h-full object-cover block"
            />
            {glyphPath && (
              <img
                src={glyphPath}
                alt=""
                aria-hidden
                className="archetype-glyph-overlay"
              />
            )}
            {displayName && (
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
                  {displayName}
                </span>
              </div>
            )}
          </div>
        </div>
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
