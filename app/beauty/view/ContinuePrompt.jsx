"use client";

import { forwardRef } from "react";

/**
 * Terminal-native continue prompt. Matches /origin: inline prompt row (> _ + cursor).
 * Not a button or card. Instruction "Press ENTER or tap to continue" must appear as a line
 * in the content stream before this component; this is just the prompt row.
 */
const ContinuePrompt = forwardRef(function ContinuePrompt(
  { onContinue, ariaLabel = "Press Enter or tap to continue" },
  ref
) {
  return (
    <div
      ref={ref}
      tabIndex={0}
      role="button"
      onClick={onContinue}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onContinue?.();
        }
      }}
      className="flex items-center gap-1 mt-2 py-2 px-0 cursor-pointer touch-manipulation outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#7A4FFF]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0d0d0f] rounded min-h-[44px]"
      style={{ color: "#9a9aa0" }}
      aria-label={ariaLabel}
    >
      <span className="text-[#7a7a80]">&gt;</span>
      <span className="flex-1 font-mono" style={{ fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace" }}>
        _
      </span>
      <span
        className="inline-block w-2 h-4 bg-[#7a7a80] animate-pulse"
        style={{ animationDuration: "1s" }}
        aria-hidden
      />
    </div>
  );
});

export default ContinuePrompt;
