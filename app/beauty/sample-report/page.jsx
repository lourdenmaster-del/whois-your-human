"use client";

import Link from "next/link";
import { SeeMoreUnlock } from "../view/SeeMoreFootnote";
import { SAMPLE_REPORT_IGNIS } from "@/lib/sample-report";

/**
 * Sample full report page — deeper interpretive sections.
 * Uses SAMPLE_REPORT_IGNIS from lib/sample-report.ts.
 * Same registry styling as /beauty/view.
 */
function ReportSection({ title, children }) {
  return (
    <section className="beauty-form-card p-5 sm:p-6 border-l-[3px] border-[#7A4FFF]/70">
      <h2 className="registry-label mb-4">{title}</h2>
      <div className="space-y-3">
        {children}
      </div>
      <SeeMoreUnlock />
    </section>
  );
}

function ReportSectionPlain({ title, children }) {
  return (
    <section className="beauty-form-card p-5 sm:p-6">
      <h2 className="registry-label mb-4">{title}</h2>
      <div className="space-y-3">
        {children}
      </div>
      <SeeMoreUnlock />
    </section>
  );
}

function Paragraphs({ text }) {
  return text.split("\n\n").map((para, i) => (
    <p key={i} className="beauty-body text-sm text-[#c8c8cc] leading-relaxed">
      {para}
    </p>
  ));
}

export default function SampleReportPage() {
  const r = SAMPLE_REPORT_IGNIS;

  return (
    <main className="beauty-theme registry-view min-h-screen font-sans relative px-5 sm:px-8 lg:px-12 py-16 sm:py-20">
      <div className="max-w-[600px] mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1">
            <Link
              href="/beauty/view?reportId=exemplar-Ignispectrum"
              className="registry-ctrl text-[11px] font-medium text-[#7A4FFF] hover:underline"
            >
              ← Return to preview dossier
            </Link>
            <Link
              href="/origin"
              className="registry-ctrl text-[11px] font-medium text-[#9a9aa0] hover:text-[#7A4FFF] hover:underline"
            >
              ← Back to Origin
            </Link>
          </div>
          <div className="registry-meta flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-[#9a9aa0]">
            <span>Sample full record</span>
          </div>
        </div>

        <header className="space-y-4 pb-6 border-b border-[#2a2a2e]">
          <p className="registry-label">Sample report</p>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#e8e8ec] tracking-tight" style={{ fontFamily: "var(--font-beauty-serif), Georgia, serif" }}>
            Full identity resolution (sample)
          </h1>
          <p className="text-sm text-[#9a9aa0] leading-relaxed">
            This sample illustrates the depth of a complete LIGS registry resolution. A personalized report examines your specific solar conditions and identity field structure.
          </p>
        </header>

        <ReportSection title="INITIATION">
          <Paragraphs text={r.initiation} />
        </ReportSection>

        <ReportSection title="COSMIC TWIN RELATION">
          <Paragraphs text={r.cosmicTwin} />
        </ReportSection>

        <ReportSectionPlain title="FIELD CONDITIONS">
          <Paragraphs text={r.fieldConditions} />
        </ReportSectionPlain>

        <ReportSectionPlain title="ARCHETYPE EXPRESSION">
          <Paragraphs text={r.archetypeExpression} />
        </ReportSectionPlain>

        <ReportSectionPlain title="DEVIATIONS">
          <Paragraphs text={r.deviations} />
        </ReportSectionPlain>

        <ReportSectionPlain title="RETURN TO COHERENCE">
          <Paragraphs text={r.returnToCoherence} />
        </ReportSectionPlain>

        <hr className="border-[var(--beauty-line)]/40" />

        <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            href="/beauty/view?reportId=exemplar-Ignispectrum"
            className="registry-ctrl inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] text-[#c8c8cc] font-mono text-[11px] font-medium hover:border-[#7A4FFF]/50 hover:text-[#e8e8ec] transition-colors focus:outline-none focus:border-[#7A4FFF]/50 touch-manipulation"
          >
            ← Return to preview dossier
          </Link>
          <Link
            href="/origin"
            className="registry-ctrl inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 text-[11px] font-medium text-[#9a9aa0] hover:text-[#7A4FFF] hover:underline touch-manipulation"
          >
            ← Back to Origin
          </Link>
        </div>

        <footer className="pt-6 text-center">
          <p className="registry-meta text-[10px] font-normal">
            Sample record — not a personalized identity resolution.
          </p>
        </footer>
      </div>
    </main>
  );
}
