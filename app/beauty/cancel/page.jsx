"use client";

import Link from "next/link";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

export default function BeautyCancelPage() {
  useEffect(() => {
    track("beauty_cancel_page");
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
      <div className="w-full max-w-2xl min-w-0">
        <div
          className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden px-6 py-12 text-center"
          style={{
            boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          <h1 className="text-xl sm:text-2xl font-semibold tracking-wide mb-4" style={{ color: "#e8e8ec", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
            Your Sequence Was Not Completed
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "#9a9aa0" }}>
            You can begin again whenever you&apos;re ready.
          </p>
          <Link
            href="/origin"
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#7A4FFF]/50 hover:text-[#e8e8ec] transition-colors focus:outline-none focus:border-[#7A4FFF]/50 touch-manipulation"
            style={{ color: "#c8c8cc" }}
          >
            Try Again
          </Link>
        </div>
        <p
          className="mt-4 pt-3 text-center text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
          style={{ fontFamily: "inherit", color: "#8a8a90" }}
        >
          (L)IGS — Human WHOIS Resolution Engine
        </p>
      </div>
    </div>
  );
}
