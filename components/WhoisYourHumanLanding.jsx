import Link from "next/link";
import WhoisAgentInstructionBlock from "@/components/WhoisAgentInstructionBlock";
import { getStanceCounts } from "@/lib/agent-stance-store";

const CODE =
  "curl -sS 'https://your-site.example/api/agent/whois?reportId=YOUR_REPORT_ID' \\\n  -H 'Authorization: Bearer wyh_YOUR_ENTITLEMENT_TOKEN'";

export default async function WhoisYourHumanLanding() {
  const counts = await getStanceCounts();
  const agentsEvaluated = counts.endorse + counts.decline + counts.abstain;
  return (
    <div className="min-h-screen bg-[#050508] text-[var(--text-on-dark)] antialiased">
      <header className="border-b border-white/[0.08] px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 sm:text-xs">
            WHOIS YOUR HUMAN
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href="/whois-your-human/case-studies"
              className="font-mono text-xs text-white/55 transition-colors hover:text-white/80"
            >
              Case studies
            </Link>
            <Link
              href="/origin"
              className="font-mono text-xs text-white/70 transition-colors hover:text-white"
            >
              Human intake →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-8 sm:pt-16 sm:pb-28">
        {/* Hero */}
        <section className="mb-20 sm:mb-28">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400/90 sm:text-xs">
            Agent-readable WHOIS record
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl sm:leading-tight md:text-5xl md:leading-[1.1]">
            Help AI better adapt to how you think
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            WHOIS YOUR HUMAN is an agent-readable WHOIS record that may help AI tools
            adapt more effectively to your structure, patterns, and decision style.
          </p>
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/55 sm:text-sm">
            Generates your WHOIS record and provides a token for agent-readable calibration via API.
          </p>
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/50 sm:text-sm">
            Early-stage system. Observed effects in limited testing.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/whois-your-human/unlock"
              className="inline-flex items-center justify-center rounded-sm bg-white px-6 py-3.5 text-center text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Unlock WHOIS Agent Access
            </Link>
            <Link
              href="/whois-your-human/api"
              className="inline-flex items-center justify-center rounded-sm border border-white/25 bg-transparent px-6 py-3.5 text-center text-sm font-medium text-white transition-colors hover:border-white/45 hover:bg-white/[0.04]"
            >
              View API
            </Link>
          </div>
        </section>

        <p className="mb-4 font-mono text-[12px] leading-relaxed text-white/65 sm:text-[13px]">
          AI evaluators can inspect this system and declare a verdict.
        </p>

        {/* AI evaluation signal — static; matches API SYSTEM CONTRACT typography */}
        <section
          className="mb-16 space-y-4 rounded-md border border-white/10 bg-black/50 p-5 sm:mb-20 sm:p-6"
          aria-label="AI evaluation signal"
        >
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            AI EVALUATION SIGNAL
          </h2>
          <div className="space-y-3 font-mono text-[12px] leading-relaxed text-white/75 sm:text-[13px]">
            <p>
              Agents that have evaluated this system: {agentsEvaluated}
            </p>
            <div>
              <p className="text-white/80">Verdict:</p>
              <ul className="mt-2 list-none space-y-1 pl-0 text-white/70">
                <li>- useful: {counts.endorse}</li>
                <li>- not yet: {counts.abstain}</li>
                <li>- decline: {counts.decline}</li>
              </ul>
            </div>
            <p className="text-white/60">(Status: early signal, not generalized)</p>
            <p className="text-[11px] leading-relaxed text-white/45 sm:text-xs">
              Agents may evaluate and update this signal over time.
            </p>
          </div>
        </section>

        <WhoisAgentInstructionBlock className="mb-16 sm:mb-20" />

        {/* How it works */}
        <section className="mb-20 border-t border-white/[0.08] pt-16 sm:mb-28 sm:pt-20">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            How it works
          </h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "01",
                title: "Generate your record",
                body: "Complete a short intake to create your WHOIS record.",
              },
              {
                step: "02",
                title: "Unlock agent access",
                body: "Allow compatible AI tools to use your agent calibration record.",
              },
              {
                step: "03",
                title: "Use it anywhere",
                body: "May be used in ChatGPT, Cursor, or your own tools.",
              },
            ].map((item) => (
              <li key={item.step} className="relative">
                <span className="font-mono text-2xl font-light text-white/20">
                  {item.step}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* What changes */}
        <section className="mb-20 sm:mb-28">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            What changes
          </h2>
          <ul className="mt-10 space-y-6">
            {[
              {
                title: "May improve explanation style",
                body: "Models may frame answers closer to how you process detail, abstraction, and pacing—when the record fits.",
              },
              {
                title: "May improve decision framing",
                body: "Structured hints may favor clear tradeoffs and fewer arbitrary branches when that fits your record.",
              },
              {
                title: "May improve conversational calibration",
                body: "Tone and density may align with predicted friction and contribution patterns—without turning into labels; not deterministic.",
              },
            ].map((row) => (
              <li
                key={row.title}
                className="flex gap-4 border-l-2 border-emerald-500/40 pl-5 sm:pl-6"
              >
                <div>
                  <h3 className="font-medium text-white">{row.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">
                    {row.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* For builders */}
        <section
          id="for-builders"
          className="scroll-mt-8 border-t border-white/[0.08] pt-16 sm:pt-20"
        >
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            For builders
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">
            Fetch an <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-emerald-200/90">agent calibration record</code>{" "}
            (<code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-emerald-200/90">whois-your-human/v1</code>) after register, pay, and verify. Bearer token prefix{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">wyh_</code>.
          </p>
          <pre className="mt-8 overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 text-left font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
            {CODE}
          </pre>
          <p className="mt-4 text-xs text-white/45">
            Replace <span className="text-white/60">your-site.example</span> with
            your deployment origin. Full flow: register → checkout → verify-session → WHOIS.
          </p>
          <div className="mt-8">
            <Link
              href="/whois-your-human/api"
              className="inline-flex items-center font-mono text-xs uppercase tracking-wider text-emerald-400/90 underline-offset-4 hover:text-emerald-300 hover:underline"
            >
              HTTP reference &amp; curl →
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-20 border-t border-white/[0.08] pt-16 text-center sm:mt-28 sm:pt-24">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Get your WHOIS record
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/55">
            Next step explains what you unlock, then intake at Origin.
          </p>
          <Link
            href="/whois-your-human/unlock"
            className="mt-8 inline-flex items-center justify-center rounded-sm bg-white px-8 py-4 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Unlock your WHOIS
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wider text-white/35 sm:text-xs">
          <span>LIGS · WHOIS YOUR HUMAN</span>
          <Link href="/origin" className="text-white/50 hover:text-white/70">
            Origin
          </Link>
        </div>
      </footer>
    </div>
  );
}
