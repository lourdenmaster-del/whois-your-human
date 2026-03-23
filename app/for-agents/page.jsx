import Link from "next/link";
import { headers } from "next/headers";
import UseWithAISection from "./UseWithAISection";
import ApiCopyBlock from "./ApiCopyBlock";
import { formatInteractionProfile } from "@/lib/archetypes/formatters";

export const metadata = {
  title: "For agents | LIGS / WHOIS YOUR HUMAN",
  description:
    "Agent integration: inspect first, whois + alignment with Bearer wyh_ token. Protocol-first calibration.",
};

async function getOrigin() {
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")) return process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    /* ignore */
  }
  return "https://ligs.io";
}

const DEFAULT_HELP = "Start with two structured options, state tradeoffs, and confirm direction before branching.";

async function resolveProfile(searchParams) {
  const resolved = typeof searchParams?.then === "function" ? await searchParams : searchParams;
  const reportId = resolved?.reportId != null
    ? (Array.isArray(resolved.reportId) ? resolved.reportId[0] : resolved.reportId)
    : null;

  const fromFormat = (fp) => ({
    do: fp.behaviorRules ?? [],
    avoid: fp.frictionPatterns ?? [],
    help: DEFAULT_HELP,
    failure_mode: (fp.frictionPatterns ?? [])[0] ?? "",
    recovery: fp.recoveryActions ?? [],
  });

  if (!reportId) return fromFormat(formatInteractionProfile("Stabiliora"));

  try {
    const origin = await getOrigin();
    const res = await fetch(`${origin}/api/whois/${encodeURIComponent(reportId)}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    const profile = json?.status === "ok" ? json.data : null;
    const prior = profile?.agentPriorLayer;
    const archetype =
      prior?.derived_structure?.archetype ??
      profile?.dominantArchetype ??
      null;

    if (prior?.agent_directives || prior?.agent_summary) {
      const ad = prior.agent_directives ?? {};
      const as = prior.agent_summary ?? {};
      const fp = archetype ? formatInteractionProfile(archetype.trim()) : null;
      return {
        do: (ad.agent_do ?? []).filter(Boolean),
        avoid: (ad.agent_avoid ?? []).filter(Boolean),
        help: (as.help_strategy ?? "").trim() || DEFAULT_HELP,
        failure_mode: (as.failure_mode ?? "").trim(),
        recovery: fp?.recoveryActions ?? [],
      };
    }
    if (archetype && typeof archetype === "string" && archetype.trim()) {
      return fromFormat(formatInteractionProfile(archetype.trim()));
    }
  } catch {
    /* ignore */
  }
  return fromFormat(formatInteractionProfile("Stabiliora"));
}

export default async function ForAgentsPage({ searchParams }) {
  const profile = await resolveProfile(searchParams);

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

        <UseWithAISection
          doItems={profile.do}
          avoidItems={profile.avoid}
          help={profile.help}
          failureMode={profile.failure_mode}
          recoveryItems={profile.recovery}
        />

        <div className="mt-10 border-t border-white/15 pt-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white/55">
            Advanced: API & agent integration
          </h2>
        </div>

        <ApiCopyBlock />

        {/* 1. What this system is */}
        <section className="mt-8 space-y-3 rounded-md border border-white/10 bg-black/50 p-5 sm:p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            1. What this system is
          </h2>
          <p className="text-sm leading-relaxed text-white/75">
            WHOIS YOUR HUMAN gives agents a machine-usable human identity protocol. Free tier
            includes protocol derivation and alignment evaluation. Paid tier expands depth
            (full agent calibration record, measured context, civilizational function).
          </p>
        </section>

        {/* 2. What an agent needs */}
        <section className="mt-8 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            2. What an agent needs
          </h2>
          <ul className="space-y-1 text-sm text-white/75">
            <li><strong className="text-white">Report ID</strong> — UUID on success/view page</li>
            <li><strong className="text-white">Token</strong> — wyh_ entitlement token on success page after payment; or via GET /api/stripe/verify-session?session_id=cs_xxx</li>
          </ul>
          <p className="mt-2 text-xs text-white/55">
            Registry ID in the report is for reference only; API calls use Report ID.
          </p>
        </section>

        {/* 3. First two operations */}
        <section className="mt-8 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            3. First two operations to call
          </h2>
          <p className="text-sm text-white/75">
            <strong className="text-white">1. WHOIS record lookup</strong> — GET /api/agent/whois?reportId=&lt;id&gt;
            with Authorization: Bearer &lt;token&gt;
          </p>
          <p className="text-sm text-white/75">
            <strong className="text-white">2. Alignment evaluation</strong> — POST /api/agent/alignment
            with body: {"{ reportId, observed_state }"}, same auth
          </p>
        </section>

        {/* 4. What each returns */}
        <section className="mt-8 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            4. What each returns
          </h2>
          <p className="text-sm text-white/75">
            <strong className="text-white">WHOIS:</strong> Protocol fields, agent_directives (canonical; agent_guidance is legacy alias),
            derived_structure (archetype, cosmic_twin, coherence), human metadata. Schema: whois-your-human/v1.
          </p>
          <p className="text-sm text-white/75">
            <strong className="text-white">Alignment:</strong> alignment_score (0–100),
            variance_flags, recommended_adjustment, confidence. Deterministic, no LLM.
          </p>
        </section>

        {/* 5. Smallest working example */}
        <section className="mt-8 space-y-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-5">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            5. Smallest working integration
          </h2>
          <p className="text-sm text-white/75">Get inspect (no auth), then whois (with token):</p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
            {`# 1. Discover (no auth)
curl -s https://ligs.io/api/agent/inspect

# 2. WHOIS record (Bearer token)
curl -s "https://ligs.io/api/agent/whois?reportId=REPORT_ID" \\
  -H "Authorization: Bearer wyh_YOUR_TOKEN"

# 3. Alignment evaluation
curl -s -X POST https://ligs.io/api/agent/alignment \\
  -H "Authorization: Bearer wyh_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"reportId":"REPORT_ID","observed_state":{"pacing":"fast","response_length":"long"}}'`}
          </pre>
        </section>

        {/* Recommended integration order */}
        <section className="mt-8 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            Recommended integration order
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-white/75">
            <li>Call inspect</li>
            <li>Call whois (with Report ID and Token)</li>
            <li>Adapt agent behavior from agent_directives</li>
            <li>Call alignment during interaction (with observed_state)</li>
            <li>Adjust behavior from variance_flags and recommended_adjustment</li>
          </ol>
        </section>

        {/* Canonical examples */}
        <section className="mt-8 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            Canonical examples
          </h2>

          <div className="space-y-2">
            <p className="text-sm font-medium text-white/90">A. WHOIS lookup — request</p>
            <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
              {`GET /api/agent/whois?reportId=<id>
Authorization: Bearer wyh_<token>`}
            </pre>
            <p className="text-sm font-medium text-white/90 mt-4">Response (200) — minimal shape</p>
            <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
              {`{
  "schema": "whois-your-human/v1",
  "record_type": "agent_calibration_record",
  "registry": { "registry_id": "...", "record_status": "registered" },
  "human": { "subject_name": "...", "birth_date": "...", "birth_location": "..." },
  "derived_structure": {
    "archetype": "Vectoris",
    "cosmic_twin": "...",
    "coherence_score": 0.85,
    "civilizational_function": { "structural_function": "...", ... }
  },
  "agent_directives": {
    "support_style": "...",
    "decision_support": { "preferred_option_count": 2, ... },
    "agent_do": [...],
    "agent_avoid": [...]
  }
}`}
            </pre>
            <p className="mt-2 text-xs text-white/55">
              agent_guidance is also returned as legacy alias (same content). Use agent_directives.
            </p>
          </div>

          <div className="space-y-2 mt-6">
            <p className="text-sm font-medium text-white/90">B. Alignment evaluation — request</p>
            <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
              {`POST /api/agent/alignment
Authorization: Bearer wyh_<token>
Content-Type: application/json

{"reportId":"<id>","observed_state":{"pacing":"moderate","response_length":"medium","structure":"flat","decision_mode":"sequential"}}`}
            </pre>
            <p className="text-sm font-medium text-white/90 mt-4">Response (200)</p>
            <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
              {`{
  "schema": "whois-your-human/alignment/v1",
  "alignment_score": 85,
  "variance_flags": [],
  "recommended_adjustment": [],
  "confidence": "high"
}`}
            </pre>
          </div>
        </section>

        {/* Inspect + endpoint list */}
        <section className="mt-8 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            Inspect (discovery)
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            <strong className="text-white/85">GET /api/agent/inspect</strong> — no auth. Returns
            protected.whois, protected.alignment, tools.evaluate_alignment, recommended_inspection_order.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
            {`curl -s https://ligs.io/api/agent/inspect`}
          </pre>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
            Endpoint list
          </h2>
          <ul className="space-y-2 font-mono text-xs text-white/75">
            <li>GET /api/agent/inspect — public, no auth</li>
            <li>GET /api/agent/prior-format — public, no auth</li>
            <li>GET /api/agent/stance — public, no auth</li>
            <li>POST /api/agent/stance — public, no auth (rate-limited)</li>
            <li>GET /api/agent/whois?reportId=... — Bearer wyh_ token</li>
            <li>POST /api/agent/alignment — Bearer wyh_ token</li>
            <li>GET /api/agent/prior?reportId=... — Bearer wyh_ token (prior layer only)</li>
          </ul>
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
