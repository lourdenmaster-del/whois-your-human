"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LigsFooter from "@/components/LigsFooter";
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
      setStatus("error");
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
      <>
        <main className="beauty-theme min-h-screen font-sans relative flex flex-col items-center justify-center px-6 py-24">
          <div className="max-w-md w-full beauty-form-card rounded-3xl px-8 py-12 text-center">
            {isError ? (
              <>
                <p className="beauty-body text-lg beauty-text-inverse font-normal mb-6">
                  {!sessionId ? "Missing checkout session." : "Payment verification failed."}
                </p>
                <Link
                  href="/beauty"
                  className="inline-block px-6 py-3 bg-[#7A4FFF] text-white text-sm font-semibold rounded-lg hover:opacity-90"
                >
                  Back to /beauty
                </Link>
              </>
            ) : (
              <p className="beauty-body beauty-text-muted">Verifying payment…</p>
            )}
          </div>
        </main>
        <LigsFooter />
      </>
    );
  }

  if (prePurchase || !reportId) {
    return (
      <>
        <main className="beauty-theme min-h-screen font-sans relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h1 className="beauty-heading text-2xl sm:text-3xl lg:text-4xl tracking-wide beauty-text-inverse">
              You&apos;re Unlocked!
            </h1>
            <p className="beauty-body text-lg beauty-text-muted font-normal">
              Generate your Light Signature report now.
            </p>
            <div>
              <Link
                href="/beauty/start"
                className="inline-block px-6 py-3.5 bg-[#7A4FFF] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/50"
              >
                Generate my report
              </Link>
            </div>
          </div>
        </main>
        <LigsFooter />
      </>
    );
  }

  const viewUrl = `/beauty/view?reportId=${encodeURIComponent(reportId)}`;

  return (
    <>
      <main className="beauty-theme min-h-screen font-sans relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h1 className="beauty-heading text-2xl sm:text-3xl lg:text-4xl tracking-wide beauty-text-inverse">
            Your Light Identity Sequence Is Complete.
          </h1>
          <p className="beauty-body text-lg beauty-text-muted font-normal">
            We&apos;ve sent your report to your email. You can also view it anytime using the link below.
          </p>
          <div>
            <Link
              href={viewUrl}
              className="inline-block px-6 py-3.5 bg-[#7A4FFF] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/50"
            >
              View Your Report
            </Link>
          </div>
          <p className="beauty-body text-sm beauty-text-muted font-normal">
            If you don&apos;t see the email within a few minutes, check your spam folder.
          </p>
        </div>
      </main>
      <LigsFooter />
    </>
  );
}

export default function BeautySuccessPage() {
  return (
    <Suspense fallback={
      <main className="beauty-theme min-h-screen font-sans relative flex flex-col items-center justify-center px-6 py-24">
        <p className="beauty-body beauty-text-muted">Loading…</p>
      </main>
    }>
      <BeautySuccessContent />
    </Suspense>
  );
}
