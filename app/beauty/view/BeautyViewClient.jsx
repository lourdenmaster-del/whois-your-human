"use client";

/**
 * Beauty view — terminal preview flow only.
 * Exemplar: PreviewRevealSequence (top-loaded, profile-driven) → InteractiveReportSequence.
 * Real report: InteractiveReportSequence.
 * Missing/invalid reportId: simple error state + link to /origin.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";
import { unwrapResponse } from "@/lib/unwrap-response";
import { FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";
import PreviewRevealSequence from "./PreviewRevealSequence";
import InteractiveReportSequence from "./InteractiveReportSequence";

function getDryRunFromUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("dryRun") === "1" || params.get("dryRun") === "true";
}

const DRY_RUN_PLACEHOLDER = {
  reportId: "dry-run-preview",
  subjectName: "Sample Subject",
  dominantArchetype: FALLBACK_PRIMARY_ARCHETYPE,
  emotionalSnippet:
    "A resonance between structure and expression — the Light Signature reveals coherence where pattern meets possibility.",
  imageUrls: [
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3ELight Signature%3C/text%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3ELight Signature%3C/text%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3ELight Signature%3C/text%3E%3C/svg%3E",
  ],
  fullReport: "[DRY RUN] Placeholder report for layout verification. Generate a Beauty Profile via /beauty to view a real report.",
  light_signature: { raw_signal: "—", custodian: "—", oracle: "—" },
  archetype: { raw_signal: "—", custodian: "—", oracle: "—" },
  deviations: { raw_signal: "—", custodian: "—", oracle: "—" },
  corrective_vector: { raw_signal: "—", custodian: "—", oracle: "—" },
};

function ErrorState({ message, onRetry, showRetry }) {
  return (
    <main className="min-h-screen font-sans flex flex-col items-center justify-center px-6 py-24 bg-[#0a0a0b]">
      <div className="max-w-md w-full text-center space-y-6">
        <p className="font-mono text-sm text-[#c8c8cc]" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
          {message}
        </p>
        {showRetry && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded border border-[#7A4FFF]/50 bg-[#7A4FFF]/10 text-[#c4b5ff] font-mono text-sm hover:bg-[#7A4FFF]/20"
          >
            Retry
          </button>
        )}
        <Link
          href="/origin"
          className="inline-block font-mono text-sm font-medium text-[#7A4FFF] hover:underline"
        >
          ← Return to Origin
        </Link>
      </div>
    </main>
  );
}

export default function BeautyViewClient() {
  const searchParams = useSearchParams();
  const reportId = searchParams?.get?.("reportId") ?? null;
  const [dryRun, setDryRun] = useState(false);
  useEffect(() => {
    setDryRun(getDryRunFromUrl());
  }, []);

  const [urlChecked, setUrlChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [terminalComplete, setTerminalComplete] = useState(false);

  useEffect(() => {
    setUrlChecked(true);
    if (!reportId) {
      setLoading(false);
    } else {
      setProfile(null);
      setError("");
      if (reportId.startsWith("exemplar-")) {
        setTerminalComplete(false);
      }
    }
  }, [reportId]);

  useEffect(() => {
    if (!reportId?.startsWith?.("exemplar-")) setTerminalComplete(false);
  }, [reportId]);

  const loadProfile = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setError("");
    track("report_fetch", reportId);
    try {
      const res = await fetch(`/api/beauty/${encodeURIComponent(reportId)}`);
      const data = await unwrapResponse(res);
      setProfile(data);
      track("images_loaded", reportId);
    } catch (err) {
      const msg = err.message ?? "Unable to load your report.";
      const status = err?.status ?? (err instanceof Response ? err.status : undefined);
      if ((status === 404 || msg?.includes?.("BEAUTY_PROFILE_NOT_FOUND")) && dryRun) {
        setProfile(DRY_RUN_PLACEHOLDER);
        track("images_loaded", reportId);
      } else {
        setError(msg?.includes?.("BEAUTY_PROFILE_NOT_FOUND") ? "Report not found." : msg);
        track("beauty_view_error", reportId);
      }
    } finally {
      setLoading(false);
    }
  }, [reportId, dryRun]);

  useEffect(() => {
    if (!reportId || !urlChecked) return;
    loadProfile();
  }, [reportId, urlChecked, loadProfile]);

  useEffect(() => {
    if (profile && reportId) track("beauty_view_loaded", reportId);
  }, [profile, reportId]);

  const isExemplarPreview = reportId?.startsWith?.("exemplar-");
  const handleTerminalComplete = useCallback(() => setTerminalComplete(true), []);

  // Exemplar: wait for profile, then PreviewRevealSequence (top-loaded) → InteractiveReportSequence
  if (isExemplarPreview) {
    if (loading) {
      return (
        <main className="min-h-screen font-sans flex flex-col items-center justify-center px-6 py-24 bg-[#0a0a0b]">
          <p className="font-mono text-sm text-[#9a9aa0]" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
            Loading registry record…
          </p>
        </main>
      );
    }
    if (error) {
      return (
        <ErrorState
          message={error}
          onRetry={loadProfile}
          showRetry
        />
      );
    }
    if (!profile) {
      return (
        <ErrorState
          message="Report not found."
        />
      );
    }
    if (!terminalComplete) {
      return <PreviewRevealSequence profile={profile} onComplete={handleTerminalComplete} />;
    }
    return <InteractiveReportSequence profile={profile} reportId={reportId} />;
  }

  // No reportId
  if (!reportId) {
    return (
      <ErrorState
        message="No report selected."
      />
    );
  }

  // Loading
  if (loading) {
    return (
      <main className="min-h-screen font-sans flex flex-col items-center justify-center px-6 py-24 bg-[#0a0a0b]">
        <p className="font-mono text-sm text-[#9a9aa0]" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
          Loading registry record…
        </p>
      </main>
    );
  }

  // Error
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={loadProfile}
        showRetry
      />
    );
  }

  // No profile
  if (!profile) {
    return (
      <ErrorState
        message="Report not found."
      />
    );
  }

  // Invalid profile (missing major fields)
  const hasMajorFields = profile.light_signature != null || profile.vector_zero != null || profile.fullReport || profile.isExemplar;
  if (!hasMajorFields && profile.reportId !== "dry-run-preview") {
    return (
      <ErrorState
        message="Report not found."
      />
    );
  }

  // Valid report: InteractiveReportSequence only
  return <InteractiveReportSequence profile={profile} reportId={reportId} />;
}
