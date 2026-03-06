"use client";

import { sanitizeForDisplay } from "@/lib/beauty-report-presentation";

/**
 * Compact registry-level summary: regime, coherence, drift, return.
 * Uses existing profile data only. No engine changes.
 *
 * LOCKDOWN: Renders only for real reports (profile.isExemplar → null). Answers:
 * What regime resolved? What stabilizes/destabilizes? Return to coherence.
 */

function hasContent(v) {
  return v != null && typeof v === "string" && v.trim() !== "" && v !== "—";
}

function firstSentence(str, maxLen = 140) {
  if (!hasContent(str)) return "";
  const trimmed = str.trim();
  const period = trimmed.indexOf(".");
  const first = period >= 0 ? trimmed.slice(0, period + 1) : trimmed.slice(0, maxLen);
  return first.length > maxLen ? first.slice(0, maxLen).trim() + "…" : first;
}

function parseKeyMoves(text) {
  if (!text || typeof text !== "string") return [];
  const idx = text.search(/\nKey Moves\n/);
  if (idx < 0) return [];
  const part = text.slice(idx + 1);
  if (!part.startsWith("Key Moves")) return [];
  return part
    .split("\n")
    .slice(1)
    .map((l) => l.replace(/^[•\-]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 2);
}

export default function RegistrySummary({ profile }) {
  if (!profile) return null;
  if (profile.isExemplar) return null;

  const arch = profile.dominantArchetype ?? profile.archetype?.raw_signal?.slice?.(0, 24) ?? "";
  const cv = profile.corrective_vector;
  const dev = profile.deviations;
  const ls = profile.light_signature;
  const keyMoves = parseKeyMoves(profile.fullReport ?? "");

  // 1. What regime resolved?
  const regime = hasContent(arch)
    ? `This record resolves the identity field as ${arch}, a regime defined by its characteristic field structure and stabilization pattern.`
    : null;

  // 2. What stabilizes / destabilizes the field?
  const stabilizes = cv && (hasContent(cv.custodian) || hasContent(cv.oracle))
    ? firstSentence(cv.custodian || cv.oracle)
    : ls && hasContent(ls.oracle)
      ? firstSentence(ls.oracle)
      : null;
  const destabilizes = dev && (hasContent(dev.raw_signal) || hasContent(dev.oracle))
    ? firstSentence(dev.raw_signal || dev.oracle)
    : null;
  const stabilityLine =
    stabilizes && destabilizes
      ? `The field stabilizes when ${stabilizes.toLowerCase().replace(/\.$/, "")} and destabilizes when ${destabilizes.toLowerCase().replace(/\.$/, "")}.`
      : stabilizes
        ? `The field stabilizes when ${stabilizes.toLowerCase().replace(/\.$/, "")}.`
        : destabilizes
          ? `The field destabilizes when ${destabilizes.toLowerCase().replace(/\.$/, "")}.`
          : null;

  // 3. Return to coherence
  const returnLine = keyMoves.length > 0
    ? `Return to coherence is supported by ${keyMoves[0].toLowerCase().replace(/\.$/, "")}${keyMoves[1] ? `, ${keyMoves[1].toLowerCase().replace(/\.$/, "")}` : ""}.`
    : cv && hasContent(cv.raw_signal)
      ? `Return to coherence: ${firstSentence(cv.raw_signal).toLowerCase().replace(/\.$/, "")}.`
      : cv && hasContent(cv.oracle)
        ? `Return to coherence: ${firstSentence(cv.oracle).toLowerCase().replace(/\.$/, "")}.`
        : null;

  const lines = [regime, stabilityLine, returnLine]
    .filter(Boolean)
    .map((l) => sanitizeForDisplay(l))
    .filter((l) => l && l.trim());
  if (lines.length === 0) return null;

  return (
    <section className="beauty-form-card rounded-3xl p-5 border-l-4 border-[#7A4FFF]/60">
      <h2 className="beauty-body text-[11px] font-bold uppercase tracking-[0.2em] beauty-text-muted mb-3" style={{ letterSpacing: "0.2em" }}>
        REGISTRY SUMMARY
      </h2>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <p key={i} className="beauty-body text-sm beauty-text-inverse font-normal leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
