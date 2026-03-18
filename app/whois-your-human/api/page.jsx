import Link from "next/link";

export const metadata = {
  title: "WHOIS API reference | WHOIS YOUR HUMAN",
  description:
    "Agent API: register, Stripe checkout, verify-session, GET /api/agent/whois with Bearer wyh_ token.",
};

export default function WhoisApiReferencePage() {
  return (
    <div className="min-h-screen bg-[#050508] px-4 py-10 text-[var(--text-on-dark)] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
          <Link href="/whois-your-human" className="hover:text-white/70">
            ← WHOIS YOUR HUMAN
          </Link>
        </p>
        <h1 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">
          Agent HTTP reference
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Same contract as repository doc{" "}
          <code className="rounded bg-white/10 px-1 font-mono text-xs">docs/AGENT-WHOIS-API.md</code>.
          Replace <code className="font-mono text-xs text-white/80">your-site.example</code> with your deployment.
        </p>

        <section className="mt-12 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            Flow
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-white/70">
            <li>
              <code className="font-mono text-emerald-200/80">POST /api/agent/register</code> — birth payload; read{" "}
              <code className="font-mono text-xs">data.reportId</code>
            </li>
            <li>
              <code className="font-mono text-emerald-200/80">POST /api/stripe/create-checkout-session</code> —{" "}
              <code className="font-mono text-xs">{"{ reportId }"}</code>; open Checkout URL
            </li>
            <li>
              <code className="font-mono text-emerald-200/80">GET /api/stripe/verify-session?session_id=…</code> — when paid,{" "}
              <code className="font-mono text-xs">data.entitlementToken</code> (prefix{" "}
              <code className="font-mono">wyh_</code>)
            </li>
            <li>
              <code className="font-mono text-emerald-200/80">GET /api/agent/whois?reportId=…</code> — header{" "}
              <code className="font-mono text-xs">Authorization: Bearer &lt;token&gt;</code>
            </li>
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            WHOIS (minimal)
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
            {`curl -sS 'https://your-site.example/api/agent/whois?reportId=YOUR_REPORT_ID' \\
  -H 'Authorization: Bearer wyh_YOUR_ENTITLEMENT_TOKEN'`}
          </pre>
        </section>

        <section className="mt-12 border-t border-white/10 pt-10">
          <p className="text-sm text-white/55">
            Integration behavior: see{" "}
            <code className="rounded bg-white/10 px-1 font-mono text-xs">docs/AGENT_USAGE.md</code> in the repo.
          </p>
          <Link
            href="/origin"
            className="mt-8 inline-flex rounded-sm border border-white/25 px-5 py-2.5 text-sm text-white transition-colors hover:border-white/40"
          >
            Unlock (Origin intake)
          </Link>
        </section>
      </div>
    </div>
  );
}
