import { Suspense } from "react";
import BeautyLandingClient from "./beauty/BeautyLandingClient";

export default function Page() {
  return (
    <>
      <div
        className="fixed top-2 left-2 z-[9999] px-2 py-0.5 text-[10px] font-mono bg-amber-500 text-black rounded shadow"
        aria-hidden
      >
        DEPLOY CHECK: beauty-home v1
      </div>
      <Suspense fallback={
      <main className="beauty-theme min-h-screen font-sans relative flex flex-col items-center justify-center px-6 py-24">
        <p className="beauty-body beauty-text-muted">Loading…</p>
      </main>
    }>
      <BeautyLandingClient />
    </Suspense>
    </>
  );
}
