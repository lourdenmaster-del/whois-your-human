"use client";

import { forwardRef } from "react";

/**
 * Plain-text continue prompt. Clickable/focusable for Enter, Space, tap.
 * No terminal input styling (no >, _, blinking cursor).
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
      className="mt-2 text-left text-[13px] cursor-pointer touch-manipulation outline-none focus:outline-none min-h-[44px]"
      style={{ color: "#9a9aa0", fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace", background: "transparent", border: "none", boxShadow: "none" }}
      aria-label={ariaLabel}
    >
      Press ENTER or tap to continue
    </div>
  );
});

export default ContinuePrompt;
