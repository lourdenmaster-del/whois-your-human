import Link from "next/link";
import WhoisAgentInstructionBlock from "@/components/WhoisAgentInstructionBlock";

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

        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Generates your WHOIS record and provides a token for agent-readable calibration via API.
        </p>

        <section className="mt-10 space-y-5 rounded-md border border-white/10 bg-black/50 p-5 sm:mt-12 sm:p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            SYSTEM CONTRACT (v1)
          </h2>
          <div className="space-y-4 font-mono text-[12px] leading-relaxed text-white/75 sm:text-[13px]">
            <p className="text-sm font-semibold tracking-tight text-white/90 sm:text-base">
              WHOIS YOUR HUMAN — SYSTEM CONTRACT
            </p>
            <p className="text-white/55">Version: v1 (unverified)</p>
            <p>
              This is a behavioral calibration layer for AI agents—hypothesis-style, not deterministic;
              observed in early testing, not proven at scale.
            </p>
            <div>
              <p className="text-white/80">It provides:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                <li>a structured WHOIS record (basis for the agent calibration record)</li>
                <li>interaction guidance derived from that WHOIS record (evaluable, not guaranteed)</li>
                <li>a protocol for evaluating whether calibration improves coherence</li>
              </ul>
            </div>
            <div>
              <p className="text-white/80">Current status:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                <li>early validation</li>
                <li>limited test scope (n=1, two agents)</li>
                <li>observed effect, not yet generalized</li>
                <li>not deterministic; outcomes require measurement per use case</li>
              </ul>
            </div>
            <div>
              <p className="text-white/80">Canonical surfaces:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                <li>Human interface: /whois-your-human</li>
                <li>Case studies: /whois-your-human/case-studies</li>
                <li>Agent flow: register → checkout → verify → WHOIS</li>
              </ul>
              <p className="mt-3 text-white/60">
                Case studies are available after unlock.{" "}
                <Link
                  href="/whois-your-human/case-studies"
                  className="font-mono text-emerald-300/90 underline-offset-4 hover:text-emerald-200 hover:underline"
                >
                  Case studies (post-unlock)
                </Link>
              </p>
            </div>
            <div>
              <p className="text-white/80">Agents and evaluators may:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                <li>inspect the system</li>
                <li>apply calibration rules</li>
                <li>measure interaction changes</li>
                <li>declare a verdict (endorse / not yet / decline)</li>
              </ul>
            </div>
          </div>
        </section>

        <WhoisAgentInstructionBlock className="mt-10 sm:mt-12" />

        <section className="mt-12 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            Flow
          </h2>
          <p className="text-sm leading-relaxed text-white/60">
            WHOIS Agent Access: register/intake creates the server WHOIS record. Checkout and
            verify-session (after payment) issue the entitlement that enables agent-readable
            calibration via API.
            <code className="mx-1 font-mono text-xs text-emerald-200/80">GET /api/agent/whois</code>
            returns the agent calibration record JSON when the Bearer token is valid.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-white/70">
            <li>
              <code className="font-mono text-emerald-200/80">POST /api/agent/register</code> — intake payload;
              creates/opens the report; read <code className="font-mono text-xs">data.reportId</code>
            </li>
            <li>
              <code className="font-mono text-emerald-200/80">POST /api/stripe/create-checkout-session</code> —{" "}
              <code className="font-mono text-xs">{"{ reportId }"}</code>; pay via Checkout URL
            </li>
            <li>
              <code className="font-mono text-emerald-200/80">GET /api/stripe/verify-session?session_id=…</code> — after
              successful payment, read <code className="font-mono text-xs">data.entitlementToken</code> (prefix{" "}
              <code className="font-mono">wyh_</code>) to unlock API access
            </li>
            <li>
              <code className="font-mono text-emerald-200/80">GET /api/agent/whois?reportId=…</code> — header{" "}
              <code className="font-mono text-xs">Authorization: Bearer &lt;token&gt;</code>; response is the agent
              calibration record
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
