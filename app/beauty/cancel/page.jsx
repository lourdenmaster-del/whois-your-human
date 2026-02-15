"use client";

import Link from "next/link";
import { useEffect } from "react";
import LigsFooter from "@/components/LigsFooter";
import { track } from "@/lib/analytics";

export default function BeautyCancelPage() {
  useEffect(() => {
    track("beauty_cancel_page");
  }, []);

  return (
    <>
    <main className="beauty-theme min-h-screen font-sans relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32">
      <div className="max-w-2xl mx-auto">
        <div className="beauty-form-card rounded-3xl px-8 py-12 text-center space-y-6">
          <h1 className="beauty-heading text-2xl sm:text-3xl lg:text-4xl tracking-wide beauty-text-inverse">
            Your Sequence Was Not Completed.
          </h1>
          <p className="beauty-body text-lg beauty-text-inverse font-normal">
            You can begin again whenever you&apos;re ready.
          </p>
          <div>
            <Link
              href="/beauty"
              className="inline-block px-6 py-3.5 bg-[#7A4FFF] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/50"
            >
              Try Again
            </Link>
          </div>
        </div>
      </div>
    </main>
    <LigsFooter />
    </>
  );
}
