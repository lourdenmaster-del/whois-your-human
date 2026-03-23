"use client";

/**
 * Beauty view — FREE WHOIS report only.
 * Uses lib/free-whois-report: buildFreeWhoisReport + renderFreeWhoisReport.
 * No ReportDocument, no PreviewRevealSequence, no tap-to-continue, no dossier layout.
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { unwrapResponse } from "@/lib/unwrap-response";
import FlowNav from "@/components/FlowNav";
import { buildFreeWhoisReport, renderFreeWhoisReport } from "@/lib/free-whois-report";

function getDryRunFromUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("dryRun") === "1" || params.get("dryRun") === "true";
}

function ErrorState({ message, onRetry, showRetry }) {
  return (
    <main className="min-h-screen font-sans flex flex-col items-center justify-center w-full max-w-[min(100vw-2rem,1000px)] min-w-0 px-4 sm:px-6 py-6 bg-[#0a0a0b]">
      <div className="w-full text-left space-y-6">
        <p className="font-mono text-sm text-[#c8c8cc]" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
          {message}
        </p>
        {showRetry && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded border border-[#2a2a2e] font-mono text-sm text-[#c8c8cc] hover:border-[#5a5a62] hover:text-[#e8e8ec]"
          >
            Retry
          </button>
        )}
        <FlowNav variant="dark" />
      </div>
    </main>
  );
}

/** Map profile from /api/beauty/[reportId] to FreeWhoisReportData. */
function profileToFreeWhoisData(profile) {
  if (!profile) return null;
  return {
    email: profile.email ?? profile.reportId ?? "",
    created_at: profile.createdAt ?? new Date().toISOString(),
    name: profile.subjectName?.trim(),
    birthDate: profile.birthDate?.trim(),
    birthTime: profile.birthTime?.trim(),
    birthPlace: profile.birthLocation?.trim() ?? profile.birthPlace?.trim(),
    preview_archetype: profile.dominantArchetype?.trim(),
  };
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

  useEffect(() => {
    setUrlChecked(true);
    if (!reportId) {
      setLoading(false);
    } else {
      setProfile(null);
      setError("");
    }
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
        setProfile({
          reportId: "dry-run-preview",
          subjectName: "Sample Subject",
          dominantArchetype: "Ignispectrum",
          birthDate: "1990-01-01",
          birthPlace: "Sample",
          birthTime: "12:00",
          imageUrls: [
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3EWHOIS%20record%3C/text%3E%3C/svg%3E",
          ],
        });
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
      <main className="min-h-screen font-sans flex flex-col items-center justify-center w-full max-w-[min(100vw-2rem,1000px)] min-w-0 px-4 sm:px-6 py-6 bg-[#0a0a0b]">
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

  // Build FreeWhoisReport from profile
  const freeWhoisData = profileToFreeWhoisData(profile);
  if (!freeWhoisData) {
    return (
      <ErrorState
        message="Report not found."
      />
    );
  }

  let report;
  try {
    report = buildFreeWhoisReport(freeWhoisData);
  } catch {
    return (
      <ErrorState
        message="Unable to build report."
      />
    );
  }

  // Set artifact image from profile.imageUrls (prefer final/share card, then light signature, then vector zero)
  const artifactUrl = profile.imageUrls?.[2] ?? profile.imageUrls?.[1] ?? profile.imageUrls?.[0];
  if (artifactUrl) {
    report.artifactImageUrl = artifactUrl;
  }

  // Set Vector Zero addendum (robot block) from profile.vector_zero.three_voice
  const tv = profile.vector_zero?.three_voice;
  if (tv) {
    const parts = [
      tv.raw_signal?.trim(),
      tv.custodian?.trim(),
      tv.oracle?.trim(),
    ].filter((s) => typeof s === "string" && s.length > 0);
    if (parts.length > 0) {
      report.vectorZeroAddendumBody = parts.join("\n\n");
    }
  }

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://ligs.io";
  const html = renderFreeWhoisReport(report, { siteUrl });

  // Extract body content for in-page render (avoid nested html/body)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  return (
    <main
      className="min-h-screen overflow-y-auto font-sans"
      style={{
        background: "#fff",
        color: "#1a1a1a",
      }}
    >
      <div
        className="free-whois-report-content"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
        style={{
          minHeight: "100vh",
        }}
      />
      <div className="px-4 py-6 border-t border-[#e8e8e8] bg-[#fff] space-y-6">
        <div className="rounded border border-emerald-200 bg-emerald-50/60 p-4">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-emerald-800/90 mb-2">
            Use this with your AI
          </h3>
          <p className="text-sm text-[#1a1a1a]/85 mb-2">
            The Report ID below is what AI tools need. The Registry ID shown in the report is for reference only.
          </p>
          <p className="text-sm text-[#1a1a1a]/85 mb-3">
            Your Token is on the success page after payment. Copy both Report ID and Token to use with AI.
          </p>
          <p className="text-[11px] uppercase tracking-wider text-[#1a1a1a]/60 mb-1">Report ID</p>
          <pre
            className="text-xs p-3 rounded border border-emerald-200 bg-white overflow-x-auto whitespace-pre-wrap break-all font-mono text-[#1a1a1a]"
            style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
          >
            {reportId}
          </pre>
          <Link
            href={`/for-agents?reportId=${encodeURIComponent(reportId)}`}
            className="mt-3 inline-flex items-center font-mono text-[11px] text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            Agent instructions →
          </Link>
        </div>
        <FlowNav variant="light" />
      </div>
    </main>
  );
}
