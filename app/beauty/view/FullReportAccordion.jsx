"use client";

import { useState } from "react";

export default function FullReportAccordion({ fullReport, title = "Full Report" }) {
  const [open, setOpen] = useState(false);
  if (!fullReport || typeof fullReport !== "string") return null;

  return (
    <div className="beauty-form-card rounded-3xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-6 py-4 flex items-center justify-between text-left beauty-body font-semibold beauty-text-inverse hover:bg-white/5 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-bold uppercase tracking-widest beauty-text-muted" style={{ letterSpacing: "0.2em" }}>
          {title}
        </span>
        <span className="text-2xl leading-none beauty-text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-6 pb-6 pt-0 border-t border-[var(--beauty-line)]/30">
          <pre className="beauty-body text-sm beauty-text-inverse font-normal leading-relaxed whitespace-pre-wrap text-left overflow-x-auto max-h-[60vh] overflow-y-auto py-4">
            {fullReport}
          </pre>
        </div>
      )}
    </div>
  );
}
