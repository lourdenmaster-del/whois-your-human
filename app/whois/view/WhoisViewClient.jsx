"use client";

// CANONICAL WHOIS FLOW
// This file is part of the active WHOIS human→agent system.
// Do not introduce beauty-named dependencies here.

/**
 * WHOIS view — FREE WHOIS report only.
 * Uses lib/free-whois-report: buildFreeWhoisReport + renderFreeWhoisReport.
 * No ReportDocument, no PreviewRevealSequence, no tap-to-continue, no dossier layout.
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { unwrapResponse } from "@/lib/unwrap-response";
import FlowNav from "@/components/FlowNav";
import { FAKE_PAY } from "@/lib/dry-run-config";
import { setBeautyUnlocked } from "@/lib/landing-storage";
import { useApiStatus } from "@/hooks/useApiStatus";
import { buildFreeWhoisReport, renderFreeWhoisReport } from "@/lib/free-whois-report";
import { getArchetypeStaticImagePathOrFallback } from "@/lib/archetype-static-images";
import { formatInteractionProfile } from "@/lib/archetypes/formatters";

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

/** Format agentPriorLayer into instruction-style block for AI use (no token required). */
function formatPriorForCopy(prior) {
  if (!prior?.agent_summary || !prior?.agent_directives) return null;
  const ad = prior.agent_directives ?? {};
  const as = prior.agent_summary ?? {};
  const doItems = (ad.agent_do ?? []).filter((r) => typeof r === "string" && r.trim());
  const avoidItems = (ad.agent_avoid ?? []).filter((r) => typeof r === "string" && r.trim());
  const help = (as.help_strategy ?? "").trim();
  const failureMode = (as.failure_mode ?? "").trim();
  let recovery = (prior.archetype_runtime_profile?.activeCorrection ?? []).filter(
    (r) => typeof r === "string" && r.trim()
  );
  const archetype = prior?.derived_structure?.archetype?.trim();
  if (recovery.length === 0 && archetype) {
    try {
      const fp = formatInteractionProfile(archetype);
      recovery = (fp.recoveryActions ?? []).filter((r) => typeof r === "string" && r.trim());
    } catch {
      /* ignore */
    }
  }

  const parts = [
    "Paste this into ChatGPT, Claude, or Cursor:",
    "",
    "---",
    "You must follow these rules when responding to me.",
    "",
    "When responding to me:",
    "",
    ...doItems.map((r) => `- ${r}`),
  ];

  if (avoidItems.length > 0) {
    parts.push("", "Watch for:", "", ...avoidItems.map((r) => `- ${r}`));
  }

  if (failureMode || recovery.length > 0) {
    parts.push("");
    if (failureMode && recovery.length > 0) {
      parts.push(`If I seem off (e.g. ${failureMode}):`);
    } else {
      parts.push("If I seem off:");
    }
    parts.push("", ...recovery.map((r) => `- ${r}`));
  }

  if (help) {
    parts.push("", "When helping me decide:", "", `- ${help}`);
  }

  parts.push("", "Respond normally, but follow these rules.", "---");

  return parts.join("\n");
}

/** Map profile from /api/whois/[reportId] to FreeWhoisReportData. */
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
    protocol: profile.protocol ?? undefined,
  };
}

export default function WhoisViewClient() {
  const searchParams = useSearchParams();
  const reportId = searchParams?.get?.("reportId") ?? null;
  const [dryRun, setDryRun] = useState(false);
  useEffect(() => {
    setDryRun(getDryRunFromUrl());
  }, []);

  const { disabled: apiDisabled } = useApiStatus();
  const [urlChecked, setUrlChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

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
      const res = await fetch(`/api/whois/${encodeURIComponent(reportId)}`);
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
        track("whois_view_error", reportId);
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
    if (profile && reportId) track("whois_view_loaded", reportId);
  }, [profile, reportId]);

  const handleUnlockClick = async () => {
    if (!reportId || apiDisabled) return;
    if (FAKE_PAY) {
      setBeautyUnlocked();
      window.location.href = `/whois/view?reportId=${encodeURIComponent(reportId)}`;
      return;
    }
    setCheckoutError(null);
    setRedirecting(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 404 || json?.code === "BEAUTY_PROFILE_NOT_FOUND") {
          setCheckoutError(
            "This report doesn't have the underlying profile yet. Use the full flow at /beauty to generate one, then return here to unlock."
          );
        } else {
          setCheckoutError(json?.message ?? json?.error ?? "Checkout unavailable. Try again later.");
        }
        setRedirecting(false);
        return;
      }
      const url = json?.data?.url ?? json?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
        return;
      }
      setCheckoutError("No checkout URL returned.");
    } catch (err) {
      setCheckoutError("Could not start checkout. Please try again.");
    } finally {
      setRedirecting(false);
    }
  };

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

  // Set artifact image: engine image (if real) → archetype static from report's archetype → placeholder (no blank state)
  // Archetype must match report text: use report.archetypeClassification (canonical source)
  const resolvedArchetype =
    report.archetypeClassification && report.archetypeClassification !== "—"
      ? report.archetypeClassification
      : profile.dominantArchetype && profile.dominantArchetype !== "—"
        ? profile.dominantArchetype
        : "Ignispectrum";
  const engineImage = profile.imageUrls?.[2] ?? profile.imageUrls?.[1] ?? profile.imageUrls?.[0];
  const isGenericPlaceholder =
    !engineImage ||
    (typeof engineImage === "string" &&
      engineImage.startsWith("data:image/svg+xml") &&
      (engineImage.includes("WHOIS") || engineImage.includes("protocol")));
  const archetypeStatic = getArchetypeStaticImagePathOrFallback(resolvedArchetype);
  report.artifactImageUrl =
    engineImage && !isGenericPlaceholder ? engineImage : archetypeStatic;

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
  const html = renderFreeWhoisReport(report, { siteUrl, theme: "dark" });

  // Extract body content for in-page render (avoid nested html/body)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  // Hero: result confirmation + USE THIS WITH AI + upgrade (above the fold)
  const priorCopy = profile.agentPriorLayer ? formatPriorForCopy(profile.agentPriorLayer) : null;

  return (
    <main
      className="min-h-screen overflow-y-auto font-sans"
      style={{
        background: "#050508",
        color: "rgba(255,255,255,0.75)",
      }}
    >
      {/* Above the fold: result confirmation + Use this with AI + upgrade */}
      <div className="px-4 py-8 sm:px-6 sm:py-10 border-b border-white/[0.08] bg-[#050508] space-y-6">
        <p className="font-mono text-sm text-white/90" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
          Your WHOIS record is ready.
        </p>
        <p className="font-mono text-xs text-white/65" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
          {priorCopy ? "Use the block below with AI tools. No token required." : "Your full registry record is below."}
        </p>

        {priorCopy && (
          <div className="rounded-md border border-white/10 bg-black/50 p-5">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-emerald-400/85 mb-2">
              Use this with AI
            </h3>
            <p className="text-sm leading-relaxed text-white/75 mb-2">
              Paste this into ChatGPT, Claude, or Cursor to reduce cold start confusion.
            </p>
            <p className="text-sm leading-relaxed text-white/75 mb-2">
              No token required.
            </p>
            <p className="text-[11px] uppercase tracking-wider text-white/55 mb-1">COPY (click to copy)</p>
            <pre
              className="text-xs p-3 rounded border border-white/10 bg-black/30 overflow-x-auto whitespace-pre-wrap break-all font-mono text-white/85 select-all cursor-pointer"
              style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
              onClick={(e) => {
                const el = e.currentTarget;
                const sel = window.getSelection();
                const r = document.createRange();
                r.selectNodeContents(el);
                sel?.removeAllRanges();
                sel?.addRange(r);
                navigator.clipboard?.writeText?.(priorCopy);
              }}
            >
              {priorCopy}
            </pre>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
              <Link href={`/for-agents?reportId=${encodeURIComponent(reportId)}`} className="text-emerald-400/90 hover:text-emerald-400 hover:underline">
                Agent instructions →
              </Link>
              <Link href="/whois-your-human/prior-format" className="text-emerald-400/90 hover:text-emerald-400 hover:underline">
                Prior format
              </Link>
            </div>
          </div>
        )}

        <div className="rounded-md border border-white/10 bg-black/50 p-5">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-emerald-400/85 mb-2">
            Unlock full report & agent token
          </h3>
          <p className="text-sm leading-relaxed text-white/75 mb-3">
            This is the free WHOIS baseline. Expanded depth—full report, agent token, API access—is available.
          </p>
          {checkoutError && (
            <p className="text-amber-500 text-xs mb-2" role="alert">
              {checkoutError}
            </p>
          )}
          <button
            type="button"
            onClick={handleUnlockClick}
            disabled={apiDisabled || redirecting}
            className="inline-flex items-center font-mono text-xs font-medium text-emerald-400/90 border border-emerald-500/40 rounded px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {apiDisabled ? "Unavailable" : redirecting ? "Redirecting…" : "Unlock WHOIS Agent Access →"}
          </button>
        </div>
      </div>

      {/* Agent token flow: below hero */}
      <div className="px-4 py-6 border-b border-white/[0.08] bg-[#050508]">
        <div className="rounded-md border border-white/10 bg-black/50 p-5">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-emerald-400/85 mb-2">
            Agent token flow
          </h3>
          <p className="text-sm leading-relaxed text-white/75 mb-2">
            After payment, copy Report ID and Token from the success page to use with AI tools.
          </p>
          <p className="text-[11px] uppercase tracking-wider text-white/55 mb-1">Report ID</p>
          <pre
            className="text-xs p-3 rounded border border-white/10 bg-black/30 overflow-x-auto whitespace-pre-wrap break-all font-mono text-white/85"
            style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
          >
            {reportId}
          </pre>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
            <Link href={`/for-agents?reportId=${encodeURIComponent(reportId)}`} className="text-emerald-400/90 hover:text-emerald-400 hover:underline">
              Agent instructions →
            </Link>
            <Link href="/whois-your-human" className="text-emerald-400/90 hover:text-emerald-400 hover:underline">
              WHOIS YOUR HUMAN
            </Link>
            <Link href="/whois-your-human/case-studies" className="text-emerald-400/90 hover:text-emerald-400 hover:underline">
              Case studies
            </Link>
            <Link href="/whois-your-human/integration" className="text-emerald-400/90 hover:text-emerald-400 hover:underline">
              Integration
            </Link>
          </div>
        </div>
      </div>

      {/* Full report */}
      <div
        className="free-whois-report-content px-4 py-6"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
        style={{
          minHeight: "50vh",
        }}
      />
      <div className="px-4 py-6 border-t border-white/[0.08] bg-[#050508]">
        <FlowNav variant="dark" />
      </div>
    </main>
  );
}
