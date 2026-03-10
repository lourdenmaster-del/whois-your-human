"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import FlowNav from "@/components/FlowNav";
import { track } from "@/lib/analytics";
import { setBeautyUnlocked } from "@/lib/landing-storage";

function BeautySuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("loading"); // loading | paid | error
  const [reportId, setReportId] = useState(null);
  const [prePurchase, setPrePurchase] = useState(false);

  useEffect(() => {
    track("beauty_success_page");
    if (!sessionId) {
      queueMicrotask(() => setStatus("error"));
      return;
    }
    let cancelled = false;
    fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const data = json?.data ?? json;
        if (data?.paid === true) {
          setBeautyUnlocked();
          setReportId(data.reportId || null);
          setPrePurchase(data.prePurchase === true);
          setStatus("paid");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => { cancelled = true; };
  }, [sessionId]);

  if (!sessionId || status === "loading" || status === "error") {
    const isError = status === "error" || !sessionId;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
        <div className="w-full max-w-2xl min-w-0">
          <div
            className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden px-6 py-12 text-left"
            style={{
              boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            {isError ? (
              <>
                <p className="text-base mb-6" style={{ color: "#e8e8ec", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
                  {!sessionId ? "Missing checkout session." : "Payment verification failed."}
                </p>
                <Link
                  href="/origin"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors focus:outline-none focus:border-[#5a5a62] touch-manipulation"
                  style={{ color: "#c8c8cc" }}
                >
                  Back to Origin
                </Link>
              </>
            ) : (
              <p className="text-sm" style={{ color: "#9a9aa0", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
                Verifying payment…
              </p>
            )}
          </div>
          <p
            className="mt-4 pt-3 text-left text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
            style={{ fontFamily: "inherit", color: "#8a8a90" }}
          >
            (L)IGS — Human WHOIS Resolution Engine
          </p>
        </div>
      </div>
    );
  }

  if (prePurchase || !reportId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
        <div className="w-full max-w-2xl min-w-0">
          <div
            className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden px-6 py-12 text-left"
            style={{
              boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            <h1 className="text-xl sm:text-2xl font-semibold tracking-wide mb-4" style={{ color: "#e8e8ec", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
              You&apos;re Unlocked
            </h1>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "#9a9aa0" }}>
              Generate your Light Signature report now.
            </p>
            <Link
              href="/beauty/start"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors focus:outline-none focus:border-[#5a5a62] touch-manipulation"
              style={{ color: "#c8c8cc" }}
            >
              Generate my report
            </Link>
          </div>
          <p
            className="mt-4 pt-3 text-left text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
            style={{ fontFamily: "inherit", color: "#8a8a90" }}
          >
            (L)IGS — Human WHOIS Resolution Engine
          </p>
        </div>
      </div>
    );
  }

  const viewUrl = `/beauty/view?reportId=${encodeURIComponent(reportId)}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
      <div className="w-full max-w-2xl min-w-0">
        <div
          className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden px-6 py-12 text-left"
          style={{
            boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          <h1 className="text-xl sm:text-2xl font-semibold tracking-wide mb-4" style={{ color: "#e8e8ec", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
            Your Light Identity Sequence Is Complete
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "#9a9aa0" }}>
            We&apos;ve sent your report to your email. You can also view it anytime using the link below.
          </p>
          <Link
            href={viewUrl}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors focus:outline-none focus:border-[#5a5a62] touch-manipulation"
            style={{ color: "#c8c8cc" }}
          >
            View Your Report
          </Link>
          <p className="mt-6 text-xs" style={{ color: "#7a7a80" }}>
            If you don&apos;t see the email within a few minutes, check your spam folder.
          </p>
          <FlowNav variant="dark" className="mt-8" />
        </div>
        <p
          className="mt-4 pt-3 text-left text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
          style={{ fontFamily: "inherit", color: "#8a8a90" }}
        >
          (L)IGS — Human WHOIS Resolution Engine
        </p>
      </div>
    </div>
  );
}

export default function BeautySuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
          <p className="text-sm font-mono" style={{ color: "#9a9aa0" }}>
            Loading…
          </p>
        </div>
      }
    >
      <BeautySuccessContent />
    </Suspense>
  );
}
