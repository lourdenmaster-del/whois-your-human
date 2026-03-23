"use client";

import Link from "next/link";

/**
 * Bottom nav — Return to Origin | View Dossier.
 * Same on every page in the flow.
 * variant: "dark" (terminal) | "light" (paper/dossier)
 */
export default function FlowNav({ variant = "dark", className = "" }) {
  const isLight = variant === "light";
  const labelStyle = isLight
    ? { color: "rgba(0,0,0,0.5)" }
    : { color: "rgba(122,122,128,0.4)" };
  const linkClass = isLight
    ? "text-[11px] font-mono text-black/60 hover:text-black/80 hover:underline"
    : "text-[11px] font-mono text-[#9a9aa0] hover:text-[#c8c8cc] hover:underline";

  return (
    <nav className={`mt-8 ${className}`.trim()} aria-label="Flow navigation">
      <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-left" style={labelStyle}>
        Human WHOIS protocol
      </p>
      <div className="protocol-nav mt-2 flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-left">
        <Link href="/origin" className={linkClass}>
          ← Return to Origin
        </Link>
        <Link href="/whois-your-human/case-studies" className={linkClass}>
          Case studies
        </Link>
      </div>
    </nav>
  );
}
