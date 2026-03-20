import Link from "next/link";

export default function WhoisYourHumanUnlock() {
  return (
    <div className="min-h-screen bg-[#050508] text-[var(--text-on-dark)] antialiased">
      <header className="border-b border-white/[0.08] px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/whois-your-human"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white/70 sm:text-xs"
          >
            ← WHOIS YOUR HUMAN
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-8 sm:pt-16 sm:pb-32">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400/90 sm:text-xs">
          Before you begin
        </p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
          Unlock WHOIS Agent Access
        </h1>
        <p className="mt-6 text-base leading-relaxed text-white/75 sm:text-lg">
          After intake and unlock, your WHOIS record is available in an agent-readable
          form that AI tools may use to calibrate how they work with you—hypothesis-style,
          not ground truth.
        </p>

        <p className="mt-3 text-base leading-relaxed text-white/70 sm:text-lg">
          Generates your WHOIS record and provides a token for agent-readable calibration via API.
        </p>

        <div className="mt-8 text-sm leading-relaxed text-white/70">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">
            How it works:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Complete intake → creates your WHOIS record</li>
            <li>Unlock access → enables agent-readable version</li>
            <li>Use with AI → via token or prompt context</li>
          </ol>
        </div>

        <section className="mt-12 border-t border-white/[0.08] pt-10">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            What you get
          </h2>
          <ul className="mt-6 space-y-4 text-sm leading-relaxed text-white/70">
            <li className="flex gap-3 border-l-2 border-emerald-500/35 pl-4">
              <span>A structured WHOIS record</span>
            </li>
            <li className="flex gap-3 border-l-2 border-emerald-500/35 pl-4">
                <span>API access to your agent calibration record</span>
            </li>
            <li className="flex gap-3 border-l-2 border-emerald-500/35 pl-4">
                <span>A token for agent-readable calibration via API</span>
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            What it helps with
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-white/65">
            <li>May improve explanation style</li>
            <li>May improve decision framing</li>
            <li>May improve calibration in conversation</li>
          </ul>
        </section>

        <div className="mt-14 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/origin"
            className="inline-flex items-center justify-center rounded-sm bg-white px-8 py-3.5 text-center text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Begin
          </Link>
          <Link
            href="/whois-your-human/api"
            className="inline-flex items-center justify-center rounded-sm border border-white/25 bg-transparent px-8 py-3.5 text-center text-sm font-medium text-white transition-colors hover:border-white/45 hover:bg-white/[0.04]"
          >
            View API
          </Link>
        </div>
      </main>
    </div>
  );
}
