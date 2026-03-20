import Link from "next/link";

export const metadata = {
  title: "Prior format | WHOIS YOUR HUMAN",
  description:
    "Free Vector Zero prior format: portable, AI-readable. Compressed interaction prior; starting hypothesis only. Fields, example, agent instructions.",
};

const EXAMPLE_PRIOR = {
  interaction_prior: {
    label: "Vectoris",
    axes: { lateral: 0.7, vertical: 0.75, depth: 0.7 },
    coherence: 0.85,
    strategy:
      "Drive toward clear direction quickly using structured, high-signal responses. Minimize drift and ambiguity.",
    rules: [
      "lead with structure immediately",
      "limit options to 1–2 max",
      "eliminate ambiguity and filler",
      "confirm direction before expanding",
      "operate at architecture level first, details second",
    ],
    failure_modes: [
      "open-ended or exploratory responses",
      "too many options or branches",
      "lack of clear direction",
      "soft or hedged language",
    ],
    confidence: "hypothesis",
  },
};

export default function PriorFormatPage() {
  return (
    <div className="min-h-screen bg-[#050508] px-4 py-10 text-[var(--text-on-dark)] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
          <Link href="/whois-your-human" className="hover:text-white/70">
            ← WHOIS YOUR HUMAN
          </Link>
        </p>
        <h1 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">
          Portable prior format
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Free, AI-readable Vector Zero prior. For agents that can only read public materials.
          No API call required.
        </p>

        <section className="mt-10 space-y-4 rounded-md border border-white/10 bg-black/50 p-5 sm:mt-12 sm:p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            WHAT IS THE VECTOR ZERO PRIOR?
          </h2>
          <p className="text-sm leading-relaxed text-white/75">
            A compressed interaction prior derived from the Vector Zero layer of a LIGS report.
            It gives an agent a structured starting hypothesis for how to interact with a human:
            pacing, structure, option count, failure modes.
          </p>
          <p className="text-sm leading-relaxed text-white/65">
            <strong className="text-white/80">It is a starting hypothesis, not a total human model.</strong>{" "}
            Treat it as context; update based on observed behavior. The prior does not need to be
            perfectly true to help—its value is a better first move.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            FREE PRIOR FIELDS
          </h2>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <code className="font-mono text-emerald-200/90">label</code> — Archetype name (e.g. Vectoris, Fluxionis)
            </li>
            <li>
              <code className="font-mono text-emerald-200/90">axes</code> — <code className="font-mono text-xs">{"{ lateral, vertical, depth }"}</code> in 0–1
            </li>
            <li>
              <code className="font-mono text-emerald-200/90">coherence</code> — 0–1
            </li>
            <li>
              <code className="font-mono text-emerald-200/90">strategy</code> — One-line interaction strategy
            </li>
            <li>
              <code className="font-mono text-emerald-200/90">rules</code> — Array of interaction rules
            </li>
            <li>
              <code className="font-mono text-emerald-200/90">failure_modes</code> — Array of patterns to avoid
            </li>
            <li>
              <code className="font-mono text-emerald-200/90">confidence</code> — e.g. &quot;hypothesis&quot;
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            EXAMPLE PRIOR
          </h2>
          <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
            {JSON.stringify(EXAMPLE_PRIOR, null, 2)}
          </pre>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            AGENT INSTRUCTIONS
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-white/70">
            <li>Use the prior as context; do not override the user&apos;s explicit goals</li>
            <li>Prefer structure-first, bounded options, clear direction</li>
            <li>Avoid failure_modes; lean into rules where plausible</li>
            <li>Re-check fit as the thread evolves</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4 border-t border-white/10 pt-10">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            WHERE THE PROTECTED LAYER BEGINS
          </h2>
          <p className="text-sm leading-relaxed text-white/65">
            The free prior above is portable and public. The following require a paid token and are
            <strong className="text-white/75"> not</strong> exposed here:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/60">
            <li>Full WHOIS record (human metadata, measured_context, verification)</li>
            <li>Deep model output (civilizational_function, three_voice, cosmic_twin, full agent_guidance)</li>
            <li>Derivation logic (how the prior is computed from birth data)</li>
          </ul>
          <p className="mt-4 text-sm text-white/55">
            Agents with a <code className="font-mono text-xs">wyh_</code> token can call{" "}
            <code className="font-mono text-emerald-200/80">GET /api/agent/prior</code> or{" "}
            <code className="font-mono text-emerald-200/80">GET /api/agent/whois</code> for the full layer.
          </p>
        </section>

        <section className="mt-10">
          <p className="text-sm text-white/55">
            Machine-readable: <code className="font-mono text-xs">GET /api/agent/prior-format</code>
          </p>
          <Link
            href="/whois-your-human"
            className="mt-8 inline-flex rounded-sm border border-white/25 px-5 py-2.5 text-sm text-white transition-colors hover:border-white/40"
          >
            ← WHOIS YOUR HUMAN
          </Link>
        </section>
      </div>
    </div>
  );
}
