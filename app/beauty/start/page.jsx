"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LightIdentityForm from "@/components/LightIdentityForm";
import { submitToBeautySubmit, submitToBeautyDryRun } from "@/lib/engine-client";
import { unwrapResponse } from "@/lib/unwrap-response";
import { saveLastFormData, loadLastFormData, isBeautyUnlocked } from "@/lib/landing-storage";
import { TEST_MODE } from "@/lib/dry-run-config";

const PAGE_BG_URL = "/signatures/beauty-background.png";

function getDryRunFromUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("dryRun") === "1" || params.get("dryRun") === "true";
}

function getTestModeFromUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("testMode") === "1" || params.get("testMode") === "true";
}

export default function BeautyStartPage() {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFormData, setLastFormData] = useState(null);

  const dryRun = typeof window !== "undefined" && getDryRunFromUrl();
  const testModeFromUrl = typeof window !== "undefined" && getTestModeFromUrl();
  const unlocked = isUnlocked || dryRun || TEST_MODE || testModeFromUrl;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setIsUnlocked(isBeautyUnlocked());
    } catch {
      setIsUnlocked(false);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !unlocked) return;
    const stored = loadLastFormData();
    if (stored?.formData) setLastFormData(stored.formData);
  }, [mounted, unlocked]);

  useEffect(() => {
    if (!mounted) return;
    if (!unlocked) {
      router.replace("/beauty");
    }
  }, [mounted, unlocked, router]);

  const handleFormSubmit = useCallback(
    async (formData) => {
      setLoading(true);
      setError(null);
      try {
        const data = dryRun
          ? await submitToBeautyDryRun(formData)
          : await submitToBeautySubmit(formData);
        const reportId = data?.reportId;
        if (!reportId) {
          setError("Generation failed: No report ID returned. Not retrying.");
          return;
        }
        saveLastFormData(reportId, formData);
        router.replace(`/beauty/view?reportId=${encodeURIComponent(reportId)}`);
      } catch (err) {
        const reason =
          err.name === "AbortError" ? "Request timed out" : (err.message || "Something went wrong");
        setError(`Generation failed: ${reason}. Not retrying.`);
      } finally {
        setLoading(false);
      }
    },
    [dryRun, router]
  );

  if (!mounted) {
    return (
      <main className="beauty-theme min-h-screen font-sans flex flex-col items-center justify-center px-6 py-24">
        <h1 className="text-4xl font-bold text-[#7A4FFF] mb-4">START PAGE FORM</h1>
        <p className="beauty-body beauty-text-muted">Loading…</p>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main className="beauty-theme min-h-screen font-sans flex flex-col items-center justify-center px-6 py-24">
        <h1 className="text-4xl font-bold text-red-600 mb-4">START PAGE (redirecting - not unlocked)</h1>
        <p className="beauty-body beauty-text-muted">unlocked={String(unlocked)} TEST_MODE={String(TEST_MODE)}</p>
      </main>
    );
  }

  return (
    <div
      className="relative min-h-screen"
      style={{
        backgroundImage: `url(${PAGE_BG_URL})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundAttachment: "fixed",
      }}
    >
      <main className="beauty-theme beauty-page relative z-10 min-h-screen">
        <section className="relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32 border-t border-[var(--beauty-line,#e8e4e8)] bg-transparent">
          <div className="max-w-3xl mx-auto space-y-8 text-center">
            <h1 className="text-4xl font-bold text-[#7A4FFF] mb-6">START PAGE FORM</h1>
            <h1
              className="text-2xl sm:text-3xl font-semibold tracking-wide beauty-heading"
              style={{ letterSpacing: "0.02em" }}
            >
              Generate your Light Signature Report
            </h1>
            <p className="text-lg leading-relaxed font-normal beauty-body">
              Your Light Signature is already active. LIGS gives you the structure to understand it.
            </p>
            {error && (
              <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-800 font-light text-sm rounded">
                {error}
              </div>
            )}
            <div className="max-w-xl mx-auto">
              <LightIdentityForm
                onSubmit={handleFormSubmit}
                showOptionalNotes={true}
                submitButtonLabel="Generate my report"
                initialFormData={lastFormData}
              />
            </div>
            <p className="text-sm beauty-text-muted">
              <a href="/beauty" className="hover:text-[#7A4FFF] transition-colors">
                ← Back to /beauty
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
