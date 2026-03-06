"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LightIdentityForm from "@/components/LightIdentityForm";
import { submitToBeautySubmit, submitToBeautyDryRun } from "@/lib/engine-client";
import { unwrapResponse } from "@/lib/unwrap-response";
import { saveLastFormData, loadLastFormData, isBeautyUnlocked } from "@/lib/landing-storage";
import { TEST_MODE } from "@/lib/dry-run-config";
import { useApiStatus } from "@/hooks/useApiStatus";

const PAGE_BG_URL = "/ligs-landing-bg.png";

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
  const { disabled: apiDisabled } = useApiStatus();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFormData, setLastFormData] = useState(null);
  const [urlFlags, setUrlFlags] = useState({ dryRun: false, testMode: false });

  useEffect(() => {
    setUrlFlags({
      dryRun: getDryRunFromUrl(),
      testMode: getTestModeFromUrl(),
    });
  }, []);

  const dryRun = urlFlags.dryRun;
  const testModeFromUrl = urlFlags.testMode;
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
      router.replace("/origin");
    }
  }, [mounted, unlocked, router]);

  const handleFormSubmit = useCallback(
    async (formData) => {
      if (apiDisabled) return;
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
    [apiDisabled, dryRun, router]
  );

  const showBrandedLoading = !mounted || !unlocked;

  if (showBrandedLoading) {
    return (
      <div
        className="beauty-theme relative min-h-screen flex flex-col items-center justify-center px-6"
        style={{
          backgroundImage: `url(${PAGE_BG_URL})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundAttachment: "fixed",
        }}
      >
        <div
          className="absolute inset-0 z-0"
          style={{ background: "rgba(0,0,0,0.25)" }}
          aria-hidden
        />
        <div className="relative z-10 text-center max-w-md mx-auto">
          <p className="text-sm uppercase tracking-[0.2em] beauty-text-muted font-medium mb-6">
            Light Identity
          </p>
          <h1
            className="text-2xl sm:text-3xl font-semibold tracking-wide beauty-heading text-[var(--beauty-text,#0d0b10)] mb-4"
            style={{ letterSpacing: "0.02em" }}
          >
            Preparing your report…
          </h1>
          <p className="text-base beauty-body beauty-text-muted leading-relaxed mb-10">
            One moment while we bring your Light Signature into view.
          </p>
          <div
            className="flex items-center justify-center gap-2"
            role="status"
            aria-label="Loading"
          >
            <span className="beauty-start-dot w-2 h-2 rounded-full bg-[#7A4FFF]/80" />
            <span className="beauty-start-dot w-2 h-2 rounded-full bg-[#7A4FFF]/80" />
            <span className="beauty-start-dot w-2 h-2 rounded-full bg-[#7A4FFF]/80" />
          </div>
        </div>
      </div>
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
            {apiDisabled && (
              <p className="mb-6 p-4 border border-amber-300 bg-amber-50 text-amber-800 font-light text-sm rounded">
                Temporarily unavailable for maintenance. Please try again later.
              </p>
            )}
            <div className="max-w-xl mx-auto">
              <LightIdentityForm
                onSubmit={handleFormSubmit}
                showOptionalNotes={true}
                submitButtonLabel={apiDisabled ? "Unavailable" : "Generate my report"}
                initialFormData={lastFormData}
                hideSubmitButton={apiDisabled}
              />
            </div>
            <p className="text-sm beauty-text-muted">
              <a href="/origin" className="hover:text-[#7A4FFF] transition-colors">
                ← Back to /origin
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
