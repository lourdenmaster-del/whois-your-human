"use client";

const API_PROMPT = `I use WHOIS YOUR HUMAN for AI calibration. To support me well:

1. First call: GET https://ligs.io/api/agent/inspect (no login required)
2. I have Report ID and Token from my success page. When I share them, use them for whois and alignment.
3. WHOIS: GET https://ligs.io/api/agent/whois?reportId=<my Report ID> with header: Authorization: Bearer <my Token>
4. Adapt to my agent_directives from the response.

More detail: https://ligs.io/for-agents`;

export default function ApiCopyBlock() {
  return (
    <section className="mt-8 space-y-3 rounded-md border border-white/10 bg-black/50 p-5 sm:p-6">
      <p className="text-sm leading-relaxed text-white/75">
        For programmatic integration: inspect, whois, and alignment endpoints.
      </p>
      <p className="text-[11px] uppercase tracking-wider text-white/55">Copy (click to copy)</p>
      <pre
        className="cursor-pointer select-all overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-white/10 bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs"
        onClick={() => navigator?.clipboard?.writeText?.(API_PROMPT)}
      >
        {API_PROMPT}
      </pre>
    </section>
  );
}
