"use client";

import Link from "next/link";

/**
 * Registry-style footnote linking to sample report or unlock flow.
 * Small, subtle, monospace. Not marketing CTA.
 */
export function SeeMoreSampleReport() {
  return (
    <p className="mt-4 pt-3 border-t border-[#2a2a2e]/40">
      <Link
        href="/beauty/sample-report"
        className="registry-meta text-[10px] font-mono uppercase tracking-wider text-[#9a9aa0] hover:text-[#c8c8cc] hover:underline transition-colors"
      >
        See more: open sample full record →
      </Link>
    </p>
  );
}

/**
 * Registry-style footnote linking to unlock flow.
 * Used on sample report page.
 */
export function SeeMoreUnlock() {
  return (
    <p className="mt-4 pt-3 border-t border-[#2a2a2e]/40">
      <Link
        href="/origin"
        className="registry-meta text-[10px] font-mono uppercase tracking-wider text-[#9a9aa0] hover:text-[#c8c8cc] hover:underline transition-colors"
      >
        See more: unlock your full identity record →
      </Link>
    </p>
  );
}
