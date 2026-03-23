"use client";

export default function UseWithAISection({
  doItems = [],
  avoidItems = [],
  help = "",
  failureMode = "",
  recoveryItems = [],
}) {
  const parts = [
    "Paste this into ChatGPT, Claude, or Cursor:",
    "",
    "---",
    "You must follow these rules when responding to me.",
    "",
    "When responding to me:",
    "",
    ...doItems.map((r) => `- ${r}`),
  ];

  if (avoidItems.length > 0) {
    parts.push("", "Watch for:", "", ...avoidItems.map((r) => `- ${r}`));
  }

  if (failureMode || recoveryItems.length > 0) {
    parts.push("");
    if (failureMode && recoveryItems.length > 0) {
      parts.push(`If I seem off (e.g. ${failureMode}):`);
    } else {
      parts.push("If I seem off:");
    }
    parts.push("", ...recoveryItems.map((r) => `- ${r}`));
  }

  if (help) {
    parts.push("", "When helping me decide:", "", `- ${help}`);
  }

  parts.push("", "Respond normally, but follow these rules.", "---");

  const humanBlock = parts.join("\n");

  const copyToClipboard = (text) => {
    if (typeof navigator?.clipboard?.writeText === "function") {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <section className="mt-8 space-y-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6">
      <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
        Use this with AI
      </h2>
      <p className="text-sm leading-relaxed text-white/75">
        Copy the block below and paste it into ChatGPT, Claude, Cursor, or any AI tool. No API setup—just paste.
      </p>
      <p className="text-[11px] uppercase tracking-wider text-white/55">Copy (click to copy)</p>
      <pre
        className="cursor-pointer select-all overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs"
        onClick={() => copyToClipboard(humanBlock)}
      >
        {humanBlock}
      </pre>
    </section>
  );
}
