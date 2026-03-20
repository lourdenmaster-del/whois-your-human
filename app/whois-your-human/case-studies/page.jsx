import Link from "next/link";
import WhoisAgentInstructionBlock from "@/components/WhoisAgentInstructionBlock";

export const metadata = {
  title: "Case studies | WHOIS YOUR HUMAN",
  description:
    "Static audit-style write-ups (early-stage, anecdotal)—readable by humans and agents; not population-level evidence.",
};

const CASES = [
  {
    id: "WYH-001",
    href: "/whois-your-human/case-studies/wyh-001",
    blurb: "Baseline intake → WHOIS record (agent calibration record) → first agent use.",
  },
  {
    id: "WYH-001-B",
    href: "/whois-your-human/case-studies/wyh-001-b",
    blurb: "Variant run under tightened framing constraints.",
  },
  {
    id: "WYH-004",
    href: "/whois-your-human/case-studies/wyh-004",
    blurb: "Calibration artifact: WHOIS record vs observed behavior; partial alignment, contradicted claims.",
  },
  {
    id: "WYH-005",
    href: "/whois-your-human/case-studies/wyh-005",
    blurb: "Agent interaction evaluation: live session calibration; human-AI alignment patterns.",
  },
];

export default function WhoisCaseStudiesIndexPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-[var(--text-on-dark)] antialiased">
      <header className="border-b border-white/[0.08] px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/whois-your-human"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white/70 sm:text-xs"
          >
            ← WHOIS YOUR HUMAN
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-8 sm:pt-16 sm:pb-32">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400/90 sm:text-xs">
          Audit write-ups
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Case studies
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">
          Fixed, versioned write-ups for inspection (human or tool). No live data;
          copy updates only via deploy. Early-stage; anecdotal, not population-level evidence.
        </p>

        <WhoisAgentInstructionBlock className="mt-10" />

        <ul className="mt-14 space-y-6 border-t border-white/[0.08] pt-12">
          {CASES.map((c) => (
            <li
              key={c.id}
              className="border-l-2 border-emerald-500/35 pl-5 sm:pl-6"
            >
              <Link
                href={c.href}
                className="font-mono text-sm uppercase tracking-[0.12em] text-emerald-300/90 hover:text-emerald-200"
              >
                {c.id}
              </Link>
              <p className="mt-2 text-sm text-white/60">{c.blurb}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
