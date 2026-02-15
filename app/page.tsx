"use client";

import { Suspense } from "react";
import LandingPage from "./LandingPage";

function LandingFallback() {
  return (
    <main className="min-h-screen font-sans bg-[#050814] flex items-center justify-center">
      <p className="text-[#F5F5F5]/80">Loading…</p>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LandingFallback />}>
      <LandingPage />
    </Suspense>
  );
}
