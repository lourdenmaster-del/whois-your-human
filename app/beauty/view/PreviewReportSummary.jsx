"use client";

import { sanitizeForDisplay } from "@/lib/beauty-report-presentation";
import { buildArtifactsFromProfile } from "@/components/ArchetypeArtifactCard";

/**
 * Preview Report Summary — short interpretation excerpt built from profile data.
 * Uses light_signature, archetype, deviations, corrective_vector, Key Moves, cosmic analogue.
 * No static exemplar text; derives from existing report layer.
 */
function hasContent(v) {
  return v != null && typeof v === "string" && v.trim() !== "" && v !== "—";
}

function firstSentence(str, maxLen = 120) {
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
    .filter(Boolean);
}

export default function PreviewReportSummary({ profile }) {
  if (!profile) return null;

  const arch = profile.dominantArchetype ?? profile.archetype?.raw_signal?.slice?.(0, 24) ?? "";
  const ls = profile.light_signature;
  const archSection = profile.archetype;
  const dev = profile.deviations;
  const cv = profile.corrective_vector;
  const keyMoves = parseKeyMoves(profile.fullReport ?? "");
  const artifacts = buildArtifactsFromProfile(profile);
  const cosmicAnalogue = artifacts?.cosmicAnalogue;

  const lines = [];

  // 1. Regime resolution
  if (hasContent(arch)) {
    lines.push(
      `The registry resolves this identity within the ${arch} class — a light environment defined by its characteristic field structure and stabilization pattern.`
    );
  }

  // 2. Field expression (from archetype or light_signature)
  const expression =
    archSection && (hasContent(archSection.oracle) || hasContent(archSection.custodian))
      ? firstSentence(archSection.oracle || archSection.custodian)
      : ls && hasContent(ls.oracle)
        ? firstSentence(ls.oracle)
        : null;
  if (expression) {
    const cleaned = expression
      .replace(/^in practice,\s*you\s+/i, "")
      .replace(/^you tend to\s+/i, "")
      .replace(/\.$/, "")
      .toLowerCase()
      .trim();
    if (cleaned.length > 15) {
      lines.push(`Individuals expressed through this field tend to ${cleaned}.`);
    }
  }

  // 3. Cosmic analogue
  if (hasContent(cosmicAnalogue) && cosmicAnalogue !== "—") {
    lines.push(`The cosmic analogue for this configuration resembles ${cosmicAnalogue.toLowerCase()}.`);
  }

  // 4. Human manifestation (from light_signature or archetype custodian)
  const manifest =
    ls && hasContent(ls.custodian)
      ? firstSentence(ls.custodian)
      : archSection && hasContent(archSection.custodian)
        ? firstSentence(archSection.custodian)
        : null;
  if (manifest) {
    const cleaned = manifest.replace(/^In practice,\s*/i, "").replace(/^You tend to\s+/i, "");
    if (cleaned.length > 20) lines.push(`In human terms, this identity frequently manifests as ${cleaned.toLowerCase().replace(/\.$/, "")}.`);
  }

  // 5. Full report teaser (deviations + corrective_vector)
  const hasDeviations = dev && (hasContent(dev.raw_signal) || hasContent(dev.oracle));
  const hasReturn = cv && (hasContent(cv.raw_signal) || hasContent(cv.oracle)) || keyMoves.length > 0;
  if (hasDeviations || hasReturn) {
    lines.push(
      "The full report examines where this pattern stabilizes, where it risks overextension, and how coherence can be maintained across changing environments."
    );
  }

  const sanitized = lines
    .filter(Boolean)
    .map((l) => sanitizeForDisplay(l))
    .filter((l) => l && l.trim());

  return sanitized.length === 0 ? null : (
    <section className="beauty-form-card p-5 sm:p-6 border-l-[3px] border-[#7A4FFF]/70">
      <h2 className="registry-label mb-3">
        REPORT SUMMARY
      </h2>
      <div className="space-y-3">
        {sanitized.map((line, i) => (
          <p
            key={i}
            className={`beauty-body text-sm font-normal leading-relaxed ${
              i === sanitized.length - 1 ? "beauty-text-muted" : "beauty-text-inverse"
            }`}
          >
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
