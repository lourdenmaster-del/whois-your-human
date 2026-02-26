"use client";

/**
 * Static (non-interactive) button used when PayUnlockButton requires birth data.
 * Renders the same visual style but is disabled — user must generate a report first.
 */
export default function StaticButton({ label = "Preview & Pay to Unlock" }) {
  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        type="button"
        disabled
        className="px-8 py-3.5 bg-[#FF3B3B]/70 text-white text-sm font-semibold cursor-not-allowed opacity-75"
        style={{ borderRadius: 0 }}
        title="Generate a report first to unlock"
      >
        {label}
      </button>
    </div>
  );
}
