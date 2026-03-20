import Link from "next/link";
import WhoisAgentInstructionBlock from "@/components/WhoisAgentInstructionBlock";

const SECTION_ORDER = [
  ["question", "Question"],
  ["subject", "Subject"],
  ["setup", "Setup"],
  ["procedure", "Procedure"],
  ["observations", "Observations"],
  ["result", "Result"],
  ["limits", "Limits"],
  ["nextQuestion", "Next question"],
];

/**
 * Static case study body for /whois-your-human/case-studies/*.
 * `fields` keys match SECTION_ORDER (plus optional title for document <title> via page metadata).
 */
export function WhoisCaseStudyShell({ children }) {
  return (
    <div className="min-h-screen bg-[#050508] text-[var(--text-on-dark)] antialiased">
      <header className="border-b border-white/[0.08] px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/whois-your-human/case-studies"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white/70 sm:text-xs"
          >
            ← Case studies
          </Link>
          <Link
            href="/whois-your-human"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white/60 sm:text-xs"
          >
            WHOIS YOUR HUMAN
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-8 sm:pt-14 sm:pb-32">
        {children}
      </main>
    </div>
  );
}

export default function WhoisCaseStudyDocument({
  caseId,
  fields,
  tailSections = [],
}) {
  return (
    <WhoisCaseStudyShell>
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400/90 sm:text-xs">
        Case study
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {caseId}
      </h1>
      <p className="mt-2 text-xs text-white/45 font-mono uppercase tracking-wider">
        Audit record · static · anecdotal
      </p>

      <WhoisAgentInstructionBlock className="mt-10" />

      <section className="mt-10 border-t border-white/[0.08] pt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
          Case ID
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/85 font-mono">{caseId}</p>
      </section>

      {SECTION_ORDER.map(([key, label]) => (
        <section
          key={key}
          className="mt-10 border-t border-white/[0.08] pt-8"
        >
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            {label}
          </h2>
          <div className="mt-3 text-sm leading-relaxed text-white/70 whitespace-pre-wrap">
            {fields[key] ?? "—"}
          </div>
        </section>
      ))}
      {tailSections.map((section) => (
        <section
          key={section.key}
          className="mt-10 border-t border-white/[0.08] pt-8"
        >
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            {section.label}
          </h2>
          <div className="mt-3 text-sm leading-relaxed text-white/70 whitespace-pre-wrap">
            {section.content ?? "—"}
          </div>
        </section>
      ))}
    </WhoisCaseStudyShell>
  );
}
