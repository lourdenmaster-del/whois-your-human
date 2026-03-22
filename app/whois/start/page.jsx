"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LightIdentityForm from "@/components/LightIdentityForm";
import FlowNav from "@/components/FlowNav";
import { submitToBeautySubmit, submitToBeautyDryRun } from "@/lib/engine-client";
import { saveLastFormData, loadLastFormData, isBeautyUnlocked } from "@/lib/landing-storage";
import { TEST_MODE } from "@/lib/dry-run-config";
import { useApiStatus } from "@/hooks/useApiStatus";

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

export default function WhoisStartPage() {
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
        router.replace(`/whois/view?reportId=${encodeURIComponent(reportId)}`);
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
        <div className="w-full max-w-2xl min-w-0">
          <div
            className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden px-6 py-12 text-left"
            style={{
              boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            <p
              className="text-[10px] font-mono uppercase tracking-[0.2em] mb-6"
              style={{ color: "#9a9aa0" }}
            >
              LIGS
            </p>
            <h1
              className="text-xl sm:text-2xl font-semibold tracking-wide mb-4"
              style={{ color: "#e8e8ec", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
            >
              Preparing your report…
            </h1>
            <p className="text-sm leading-relaxed mb-10" style={{ color: "#9a9aa0" }}>
              One moment while we bring your WHOIS record into view.
            </p>
            <div className="flex items-center justify-center gap-2" role="status" aria-label="Loading">
              <span className="w-2 h-2 rounded-full bg-[#7a7a80] animate-pulse" style={{ animationDuration: "1s" }} />
              <span className="w-2 h-2 rounded-full bg-[#7a7a80] animate-pulse" style={{ animationDuration: "1s", animationDelay: "0.2s" }} />
              <span className="w-2 h-2 rounded-full bg-[#7a7a80] animate-pulse" style={{ animationDuration: "1s", animationDelay: "0.4s" }} />
            </div>
          </div>
          <p
            className="mt-4 pt-3 text-left text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
            style={{ fontFamily: "inherit", color: "#8a8a90" }}
          >
            LIGS
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
      <div className="w-full max-w-2xl min-w-0">
        <div
          className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden"
          style={{
            boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="px-4 py-2.5 border-b border-[#2a2a2e] flex items-center gap-2"
            style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a4a4e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a4a4e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a4a4e]" />
            <span className="ml-2 text-[10px] uppercase tracking-widest font-mono" style={{ color: "#a8a8b0" }}>
              LIGS
            </span>
          </div>
          <div className="px-5 sm:px-6 py-8 space-y-6">
            <div className="text-left space-y-2">
              <h1
                className="text-xl sm:text-2xl font-semibold tracking-wide"
                style={{ color: "#e8e8ec", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
              >
                Execute full resolution
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "#9a9aa0" }}>
                Mint active. Execute resolution to generate your full Resolution Record.
              </p>
            </div>
            {error && (
              <div className="p-4 border border-[#4a3030] rounded bg-[#1a0f0f] text-sm" style={{ color: "#e8a0a0" }}>
                {error}
              </div>
            )}
            {apiDisabled && (
              <div className="p-4 border border-[#4a4030] rounded bg-[#1a1810] text-sm" style={{ color: "#e8d8a0" }}>
                Temporarily unavailable for maintenance. Please try again later.
              </div>
            )}
            <LightIdentityForm
              onSubmit={handleFormSubmit}
              showOptionalNotes={true}
              submitButtonLabel={apiDisabled ? "Unavailable" : "Execute resolution"}
              initialFormData={lastFormData}
              hideSubmitButton={apiDisabled}
            />
            <FlowNav variant="dark" className="mt-6" />
          </div>
        </div>
        <p
          className="mt-4 pt-3 text-left text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
          style={{ fontFamily: "inherit", color: "#8a8a90" }}
        >
          LIGS
        </p>
      </div>
    </div>
  );
}
