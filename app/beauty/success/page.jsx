"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LigsFooter from "@/components/LigsFooter";
import { track } from "@/lib/analytics";

export default function BeautySuccessPage() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  useEffect(() => {
    track("beauty_success_page");
  }, []);

  if (!reportId) {
    return (
      <>
        <main className="beauty-theme min-h-screen font-sans relative flex flex-col items-center justify-center px-6 py-24">
          <div className="max-w-md w-full beauty-form-card rounded-3xl px-8 py-12 text-center">
            <p className="beauty-body text-lg beauty-text-inverse font-normal">
              Missing report ID.
            </p>
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
              className="inline-block px-6 py-3.5 bg-[#7A4FFF] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/50"
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
