"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Sample full report page — removed from public flow.
 * Redirects to /origin. Route kept for code safety; no public links lead here.
 */
export default function SampleReportPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/origin");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
      <p className="font-mono text-sm text-[#9a9aa0]" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
        Redirecting…
      </p>
    </div>
  );
}
