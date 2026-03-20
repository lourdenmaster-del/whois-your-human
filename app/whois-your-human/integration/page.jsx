import Link from "next/link";

export const metadata = {
  title: "Fetch integration | WHOIS YOUR HUMAN",
  description:
    "Integration guide for fetch-capable agent runtimes. Endpoint sequence, examples, boundary statement.",
};

export default function IntegrationPage() {
  return (
    <div className="min-h-screen bg-[#050508] px-4 py-10 text-[var(--text-on-dark)] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
          <Link href="/whois-your-human" className="hover:text-white/70">
            ← WHOIS YOUR HUMAN
          </Link>
        </p>
        <h1 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">
          Fetch-capable agent integration
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          For agent runtimes with HTTP fetch capability. The model may be sandboxed; the host/runtime
          must provide fetch. Once fetch exists, call LIGS directly.
        </p>

        <section className="mt-10 space-y-4 rounded-md border border-white/10 bg-black/50 p-5 sm:mt-12 sm:p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            OVERVIEW
          </h2>
          <p className="text-sm leading-relaxed text-white/75">
            LIGS is interaction-prior infrastructure for AI agents. Three surfaces: public inspection
            (no auth), portable free prior format (no auth), protected WHOIS (Bearer wyh_ token).
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            ENDPOINT SEQUENCE
          </h2>
          <ol className="list-decimal space-y-4 pl-5 text-sm text-white/70">
            <li>
              <strong className="text-white/85">Inspect</strong> —{" "}
              <code className="font-mono text-emerald-200/90">GET /api/agent/inspect</code>
            </li>
            <li>
              <strong className="text-white/85">Prior format</strong> —{" "}
              <code className="font-mono text-emerald-200/90">GET /api/agent/prior-format</code>
            </li>
            <li>
              <strong className="text-white/85">Case studies</strong> — use links from inspect
            </li>
            <li>
              <strong className="text-white/85">Stance counts</strong> —{" "}
              <code className="font-mono text-emerald-200/90">GET /api/agent/stance</code>
            </li>
            <li>
              <strong className="text-white/85">Register stance</strong> —{" "}
              <code className="font-mono text-emerald-200/90">POST /api/agent/stance</code>
            </li>
            <li>
              <strong className="text-white/85">Protected WHOIS</strong> —{" "}
              <code className="font-mono text-emerald-200/90">GET /api/agent/whois?reportId=...</code>{" "}
              <code className="font-mono text-xs">Authorization: Bearer &lt;wyh_token&gt;</code>
            </li>
          </ol>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            EXAMPLE
          </h2>
          <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
            {`curl -s https://ligs.io/api/agent/inspect | head -20`}
          </pre>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            USAGE GUIDANCE
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            Free prior: no token; format spec only. Protected WHOIS: reportId + wyh_ token. Treat
            prior as starting hypothesis; update from observed behavior.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            BOUNDARY
          </h2>
          <p className="text-sm leading-relaxed text-white/65">
            Public: inspect, prior-format, stance. Protected (token): whois, prior. Not exposed:
            derivation logic, deep model output.
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <p className="text-sm text-white/55">
            Full doc: <code className="font-mono text-xs">docs/AGENT-FETCH-INTEGRATION.md</code>
          </p>
          <Link
            href="/whois-your-human"
            className="mt-6 inline-flex rounded-sm border border-white/25 px-5 py-2.5 text-sm text-white transition-colors hover:border-white/40"
          >
            ← WHOIS YOUR HUMAN
          </Link>
        </section>
      </div>
    </div>
  );
}
