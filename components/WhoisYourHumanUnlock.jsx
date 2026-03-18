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
          Unlock your AI identity layer
        </h1>
        <p className="mt-6 text-base leading-relaxed text-white/75 sm:text-lg">
          This creates a machine-readable WHOIS record that AI tools can use to
          better understand how to work with you.
        </p>

        <section className="mt-12 border-t border-white/[0.08] pt-10">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            What you get
          </h2>
          <ul className="mt-6 space-y-4 text-sm leading-relaxed text-white/70">
            <li className="flex gap-3 border-l-2 border-emerald-500/35 pl-4">
              <span>A structured identity record</span>
            </li>
            <li className="flex gap-3 border-l-2 border-emerald-500/35 pl-4">
              <span>Agent-readable WHOIS access</span>
            </li>
            <li className="flex gap-3 border-l-2 border-emerald-500/35 pl-4">
              <span>A tokenized layer for AI use</span>
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            What it helps with
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-white/65">
            <li>Better explanations</li>
            <li>Better decision support</li>
            <li>Better calibration in conversation</li>
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
