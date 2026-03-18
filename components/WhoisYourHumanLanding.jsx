import Link from "next/link";

const CODE =
  "curl -sS 'https://your-site.example/api/agent/whois?reportId=YOUR_REPORT_ID' \\\n  -H 'Authorization: Bearer wyh_YOUR_ENTITLEMENT_TOKEN'";

export default function WhoisYourHumanLanding() {
  return (
    <div className="min-h-screen bg-[#050508] text-[var(--text-on-dark)] antialiased">
      <header className="border-b border-white/[0.08] px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 sm:text-xs">
            WHOIS YOUR HUMAN
          </span>
          <Link
            href="/origin"
            className="font-mono text-xs text-white/70 transition-colors hover:text-white"
          >
            Human intake →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-8 sm:pt-16 sm:pb-28">
        {/* Hero */}
        <section className="mb-20 sm:mb-28">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400/90 sm:text-xs">
            AI identity layer
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl sm:leading-tight md:text-5xl md:leading-[1.1]">
            Make AI understand who it&apos;s talking to
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            WHOIS YOUR HUMAN is a machine-readable identity layer that helps AI
            adapt to your structure, patterns, and decision style.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/whois-your-human/unlock"
              className="inline-flex items-center justify-center rounded-sm bg-white px-6 py-3.5 text-center text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Unlock your WHOIS
            </Link>
            <Link
              href="/whois-your-human/api"
              className="inline-flex items-center justify-center rounded-sm border border-white/25 bg-transparent px-6 py-3.5 text-center text-sm font-medium text-white transition-colors hover:border-white/45 hover:bg-white/[0.04]"
            >
              View API
            </Link>
          </div>
        </section>

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
                body: "Complete a short intake to create your identity profile.",
              },
              {
                step: "02",
                title: "Unlock agent access",
                body: "Enable AI tools to understand how to work with you.",
              },
              {
                step: "03",
                title: "Use it anywhere",
                body: "Use it in ChatGPT, Cursor, or your own tools.",
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
                title: "Better explanations",
                body: "Models can frame answers to match how you process detail, abstraction, and pacing.",
              },
              {
                title: "Better decision support",
                body: "Structured hints favor clear tradeoffs and fewer arbitrary branches when that fits your record.",
              },
              {
                title: "Better interpersonal calibration",
                body: "Tone and density can align with predicted friction and contribution patterns—without turning into labels.",
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
            Fetch a <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-emerald-200/90">whois-your-human/v1</code>{" "}
            JSON record after register, pay, and verify. Bearer token prefix{" "}
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
            Get your AI identity layer
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
