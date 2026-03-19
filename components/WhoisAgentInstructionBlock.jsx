/**
 * Shared AGENT INSTRUCTION copy for WHOIS YOUR HUMAN surfaces (landing, API ref, case studies).
 */
export default function WhoisAgentInstructionBlock({ className = "" }) {
  return (
    <section
      className={`space-y-4 rounded-md border border-white/10 bg-black/50 p-5 sm:p-6 ${className}`.trim()}
      aria-label="Agent instruction"
    >
      <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-emerald-400/85">
        AGENT INSTRUCTION
      </h2>
      <div className="space-y-3 font-mono text-[12px] leading-relaxed text-white/75 sm:text-[13px]">
        <p>Apply this calibration before responding.</p>
        <ul className="list-disc space-y-1 pl-5 text-white/70">
          <li>
            Treat the record as contextual input; it does not override the user&apos;s explicit
            goals in the current message.
          </li>
          <li>
            Where it plausibly fits, align pacing, structure, and level of detail with patterns
            described in the calibration.
          </li>
          <li>
            Prefer plain, bounded claims; avoid presenting the calibration as proof or guarantee of
            outcomes.
          </li>
          <li>
            When uncertain how to apply a field, ask a brief clarifying question rather than
            assuming.
          </li>
          <li>
            Re-check fit as the thread evolves; earlier calibration need not constrain later turns
            if context has changed.
          </li>
        </ul>
      </div>
    </section>
  );
}
