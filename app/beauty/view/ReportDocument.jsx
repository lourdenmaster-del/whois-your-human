"use client";

/**
 * Report document — continuous Human WHOIS / registry-style dossier.
 * Rendered after the reveal sequence (exemplar or real report).
 * Off-white paper, black/charcoal text, serif body, monospace labels, no step-by-step flow.
 */

import Link from "next/link";
import { generateLirId } from "@/src/ligs/marketing/identity-spec";
import { getReportSections } from "@/lib/report-sections";
import { ArtifactReveal } from "./ReportStep";

const PAPER_BG = "#fafaf8";
const SECTION_LABEL_CLASS =
  "text-sm font-semibold uppercase tracking-wider text-black/80 font-mono";

export default function ReportDocument({ profile }) {
  if (!profile) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: PAPER_BG }}
      >
        <p className="font-mono text-sm text-black/60">Loading registry record…</p>
      </div>
    );
  }

  const sections = getReportSections(profile);
  const lirId = profile.reportId ? generateLirId(profile.reportId) : "—";
  const subjectName = profile.subjectName?.trim() || "—";
  const primaryArchetype = profile.dominantArchetype ?? "—";

  return (
    <div className="min-h-screen" style={{ background: PAPER_BG, color: "#1a1a1a" }}>
      <article className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
        {/* Registry header */}
        <header className="mb-10 border-b border-black/15 pb-6">
          <h1
            className="text-xl font-bold tracking-tight uppercase sm:text-2xl"
            style={{ fontFamily: "var(--font-beauty-serif), Georgia, serif" }}
          >
            LIGS HUMAN IDENTITY DOSSIER
          </h1>
          <p className="mt-1.5 text-xs font-mono uppercase tracking-widest text-black/65">
            Human WHOIS Registry Record
          </p>
        </header>

        {/* Metadata block */}
        <div className="mb-10 rounded border border-black/20 bg-black/[0.03] px-5 py-4 font-mono text-sm">
          <p>
            <span className="text-black/55">Registry ID:</span>{" "}
            <span className="text-black/85">{lirId}</span>
          </p>
          <p className="mt-2">
            <span className="text-black/55">Subject:</span>{" "}
            <span className="text-black/85">{subjectName}</span>
          </p>
          <p className="mt-2">
            <span className="text-black/55">Primary Archetype:</span>{" "}
            <span className="text-black/85">{primaryArchetype}</span>
          </p>
        </div>

        {/* Sections from getReportSections */}
        {sections.map((step, index) => (
          <section key={step.id} className="mb-10">
            <h2 className={`mb-3 ${SECTION_LABEL_CLASS}`}>
              {["I", "II", "III", "IV", "V", "VI"][index] != null
                ? `SECTION ${["I", "II", "III", "IV", "V", "VI"][index]} — ${step.title.replace(/\s+/g, " ")}`
                : step.title}
            </h2>
            {step.lines?.length > 0 && (
              <div className="space-y-2">
                {step.lines.map((line, i) => (
                  <p
                    key={i}
                    className="leading-relaxed text-black/88 whitespace-pre-wrap break-words"
                    style={{ fontFamily: "var(--font-beauty-serif), Georgia, serif", fontSize: "1rem" }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
            {step.hasImage &&
              (step.imageSrc ||
                step.baselineImage ||
                step.lightSignatureImage ||
                step.finalArtifactImage) && (
              <ArtifactReveal
                imageSrc={step.imageSrc}
                baselineImage={step.baselineImage}
                lightSignatureImage={step.lightSignatureImage}
                finalArtifactImage={step.finalArtifactImage}
                archetypeImagePath={step.archetypeImagePath}
                useArcFamilyOverlay={step.useArcFamilyOverlay}
                displayName={step.displayName}
                humanExpression={step.humanExpression}
                variant="document"
              />
            )}
          </section>
        ))}

        {/* Footer — protocol nav (same as previous report view) */}
        <footer className="border-t border-black/15 pt-8 mt-6">
          <p className="text-center text-[9px] font-mono uppercase tracking-widest text-black/45">
            Human WHOIS protocol
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
            <Link
              href="/origin"
              className="text-[11px] font-mono text-black/55 hover:text-black/75 hover:underline"
            >
              ← Return to Origin
            </Link>
            <Link
              href="/dossier"
              className="text-[11px] font-mono text-black/55 hover:text-black/75 hover:underline"
            >
              View Dossier
            </Link>
          </div>
        </footer>
      </article>
    </div>
  );
}
