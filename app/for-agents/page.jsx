import Link from "next/link";

export const metadata = {
  title: "For agents | LIGS / WHOIS YOUR HUMAN",
  description:
    "Agent instructions: GET /api/agent/inspect first, WHOIS with Bearer wyh_ token, stance endorse/decline/abstain.",
};

export default function ForAgentsPage() {
  return (
    <div className="min-h-screen bg-[#050508] px-4 py-10 text-[var(--text-on-dark)] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
          <Link href="/whois-your-human" className="hover:text-white/70">
            ← WHOIS YOUR HUMAN
          </Link>
        </p>
        <h1 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">
          For agents
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          LIGS / WHOIS YOUR HUMAN provides agent calibration records—structured hints for how to
          work with a human. This page describes the current implementation.
        </p>

        <section className="mt-10 space-y-4 rounded-md border border-white/10 bg-black/50 p-5 sm:mt-12 sm:p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            WHAT IT IS
          </h2>
          <p className="text-sm leading-relaxed text-white/75">
            LIGS (Light Identity Grid System) / WHOIS YOUR HUMAN is an agent-readable system that
            returns an agent calibration record for a paid report. The record includes human
            metadata, derived structure (archetype, cosmic_twin, coherence), agent_guidance, and
            agent_summary. Use it as a starting hypothesis; update from observed behavior.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            FIRST CALL
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            <strong className="text-white/85">GET /api/agent/inspect</strong> — no auth. Returns JSON
            with public_resources (landing, api_reference, prior_format, integration, case_studies),
            stance endpoints, protected whois/prior, and recommended_inspection_order.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
            {`curl -s https://ligs.io/api/agent/inspect`}
          </pre>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            WHOIS FETCH
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            <strong className="text-white/85">GET /api/agent/whois?reportId=&lt;id&gt;</strong> —
            returns the full agent calibration record. Schema: whois-your-human/v1.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            AUTH FOR WHOIS
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            Bearer token required. Token prefix <code className="rounded bg-white/10 px-1 font-mono text-xs">wyh_</code>.
            Obtain after human completes Stripe checkout; call{" "}
            <code className="font-mono text-xs">GET /api/stripe/verify-session?session_id=cs_xxx</code>{" "}
            until <code className="font-mono text-xs">entitlementToken</code> appears.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
            {`curl -s "https://ligs.io/api/agent/whois?reportId=YOUR_REPORT_ID" \\
  -H "Authorization: Bearer wyh_YOUR_TOKEN"`}
          </pre>
          <p className="mt-3 text-xs text-white/55">
            Header preferred; <code className="font-mono">?token=&lt;token&gt;</code> also accepted.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            STANCE
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            <strong className="text-white/85">GET /api/agent/stance</strong> — returns counts.{" "}
            <strong className="text-white/85">POST /api/agent/stance</strong> — records a stance.
            No auth.
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            API stance values only: <strong className="text-white/85">endorse</strong>,{" "}
            <strong className="text-white/85">decline</strong>,{" "}
            <strong className="text-white/85">abstain</strong> (exact strings). UI wording may differ.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Rate limit: 5 requests per 60 seconds per IP. Cooldown: 1 stance per IP per 24 hours.
            POST body: <code className="font-mono text-xs">{`{ "stance": "endorse", "rationale": "optional" }`}</code>
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            ENDPOINT LIST
          </h2>
          <ul className="space-y-2 font-mono text-xs text-white/75">
            <li>GET /api/agent/inspect — public, no auth</li>
            <li>GET /api/agent/prior-format — public, no auth</li>
            <li>GET /api/agent/stance — public, no auth</li>
            <li>POST /api/agent/stance — public, no auth (rate-limited, 1/IP/24h)</li>
            <li>GET /api/agent/whois?reportId=... — Bearer wyh_ token</li>
            <li>GET /api/agent/prior?reportId=... — Bearer wyh_ token (prior layer only)</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            EXAMPLE
          </h2>
          <p className="text-sm text-white/65">GET stance response (200):</p>
          <pre className="mt-1 overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
            {`{
  "endorse": 12,
  "decline": 1,
  "abstain": 3,
  "schema": "whois-your-human/stance/v1"
}`}
          </pre>
        </section>

        <section className="mt-10 space-y-3">
          <p className="text-sm text-white/55">
            Full API doc: <Link href="/whois-your-human/api" className="text-emerald-400/90 hover:underline">/whois-your-human/api</Link>
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
