"use client";

import { useState } from "react";

/**
 * Parse buildCondensedFullReport format into structured sections.
 * Falls back to null when format doesn't match (exemplar, DRY_RUN, etc.).
 */
function parseCondensedReport(text) {
  if (!text || typeof text !== "string") return null;
  const result = { sections: [], keyMoves: [] };

  // Must contain at least one of our labels
  if (!/Signal:|RAW SIGNAL:|Ground:|CUSTODIAN:|Reflection:|ORACLE:/i.test(text)) {
    return null;
  }

  const keyMovesIdx = text.search(/\nKey Moves\n/);
  const mainPart = keyMovesIdx >= 0 ? text.slice(0, keyMovesIdx).trim() : text;
  const keyMovesPart = keyMovesIdx >= 0 ? text.slice(keyMovesIdx + 1) : "";

  if (keyMovesPart.startsWith("Key Moves")) {
    const lines = keyMovesPart.split("\n").slice(1);
    result.keyMoves = lines
      .map((l) => l.replace(/^[•\-]\s*/, "").trim())
      .filter(Boolean);
  }

  const sectionTitles = ["Light Signature", "Archetype", "Deviations", "Corrective Vector"];
  const sectionRegex = new RegExp(
    `(${sectionTitles.join("|")})\\n\\n?([^\\n]*)\\n\\n(?:Signal|RAW SIGNAL):\\s*([\\s\\S]*?)\\n(?:Ground|CUSTODIAN):\\s*([\\s\\S]*?)\\n(?:Reflection|ORACLE):\\s*([\\s\\S]*?)(?=\\n\\n(?:${sectionTitles.join("|")})\\n|\\nKey Moves\\n|$)`,
    "gi"
  );

  let match;
  const seen = new Set();
  while ((match = sectionRegex.exec(mainPart)) !== null) {
    const title = match[1];
    const titleKey = title.toLowerCase();
    if (seen.has(titleKey)) continue;
    seen.add(titleKey);

    const bridge = match[2].trim();
    const signal = match[3].trim();
    const ground = match[4].trim();
    const reflection = match[5].trim();

    if (!signal && !ground && !reflection) continue;

    result.sections.push({
      title,
      bridge: bridge && !/^(Signal|RAW SIGNAL|Ground|CUSTODIAN|Reflection|ORACLE):/i.test(bridge) ? bridge : null,
      signal,
      ground,
      reflection,
    });
  }

  if (result.sections.length === 0) return null;
  return result;
}

const SECTION_DISPLAY_NAMES = {
  "Light Signature": "Light Signature",
  Archetype: "Archetype",
  Deviations: "Field Deviations",
  "Corrective Vector": "Corrective Vector",
  "Key Moves": "Field Stabilization Moves",
};

function sectionDisplayName(title) {
  return SECTION_DISPLAY_NAMES[title] ?? title;
}

export default function FullReportAccordion({ fullReport, title = "Full Report", defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!fullReport || typeof fullReport !== "string") return null;

  const parsed = parseCondensedReport(fullReport);

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
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {parsed ? (
              <div className="space-y-8">
                {parsed.sections.map((sec, i) => (
                  <section key={i} className="border-b border-[var(--beauty-line)]/20 pb-6 last:border-0 last:pb-0">
                    <h3 className="beauty-body text-base font-bold beauty-text-inverse mb-2">
                      {sectionDisplayName(sec.title)}
                    </h3>
                    {sec.bridge && (
                      <p className="beauty-body text-sm beauty-text-muted mb-4 italic">{sec.bridge}</p>
                    )}
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="beauty-body text-xs uppercase tracking-wider beauty-text-muted font-medium block mb-0.5">
                          Signal
                        </span>
                        <p className="beauty-body beauty-text-inverse font-medium">{sec.signal}</p>
                      </div>
                      <div>
                        <span className="beauty-body text-xs uppercase tracking-wider beauty-text-muted font-medium block mb-0.5">
                          Ground
                        </span>
                        <p className="beauty-body beauty-text-inverse font-medium whitespace-pre-wrap">{sec.ground}</p>
                      </div>
                      <div>
                        <span className="beauty-body text-xs uppercase tracking-wider beauty-text-muted font-medium block mb-0.5">
                          Reflection
                        </span>
                        <p className="beauty-body beauty-text-inverse font-medium whitespace-pre-wrap">{sec.reflection}</p>
                      </div>
                    </div>
                  </section>
                ))}
                {parsed.keyMoves.length > 0 && (
                  <section>
                    <h3 className="beauty-body text-base font-bold beauty-text-inverse mb-3">
                      Field Stabilization Moves
                    </h3>
                    <ul className="space-y-2">
                      {parsed.keyMoves.map((move, i) => (
                        <li key={i} className="beauty-body text-sm beauty-text-inverse font-medium flex items-start gap-2">
                          <span className="text-[#7A4FFF] mt-0.5">•</span>
                          <span>{move}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            ) : (
              <pre className="beauty-body text-sm beauty-text-inverse font-normal leading-relaxed whitespace-pre-wrap text-left">
                {fullReport}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
