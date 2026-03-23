"use client";

// CANONICAL WHOIS FLOW
// This file is part of the active WHOIS human→agent system.
// Do not introduce beauty-named dependencies here.

/**
 * WHOIS view — canonical result page.
 * Flow: load profile → report + agent block + CTA. No carousel or reveal sequence.
 * Uses lib/free-whois-report: buildFreeWhoisReport + renderFreeWhoisReport.
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/analytics";
import FlowNav from "@/components/FlowNav";
import { buildFreeWhoisReport, renderFreeWhoisReport } from "@/lib/free-whois-report";
import { getArchetypeStaticImagePathOrFallback } from "@/lib/archetype-static-images";
import {
  resolveInstructionsFromProfile,
  buildAgentInstructionText,
} from "@/lib/agent-instruction-copy";
import { FAKE_PAY } from "@/lib/dry-run-config";
import { setWhoisUnlocked } from "@/lib/landing-storage";

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

  const [urlChecked, setUrlChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [registryCount, setRegistryCount] = useState(null);
  const [stanceCounts, setStanceCounts] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/registry/count")
      .then((r) => r.json())
      .then((data) => {
        const total = data?.total;
        if (typeof total === "number" && total >= 0) setRegistryCount(total);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/agent/stance")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.endorse === "number" && typeof data.decline === "number" && typeof data.abstain === "number") {
          setStanceCounts({ endorse: data.endorse, decline: data.decline, abstain: data.abstain });
        }
      })
      .catch(() => {});
  }, []);

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
      const json = await res.json().catch(() => ({}));
      const data = json?.status === "ok" ? json.data : (res.ok && json?.data ? json.data : null);
      if (!data || typeof data !== "object") {
        const msg = json?.error ?? json?.message ?? (res.status ? `Request failed (HTTP ${res.status})` : "Unable to load report.");
        throw Object.assign(new Error(msg), { status: res.status });
      }
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

  const handleUnlockClick = useCallback(async () => {
    if (!reportId || redirecting) return;
    if (FAKE_PAY) {
      setWhoisUnlocked();
      window.location.href = `/whois/view?reportId=${encodeURIComponent(reportId)}`;
      return;
    }
    setCheckoutError("");
    setRedirecting(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          res.status === 404 || json?.code === "BEAUTY_PROFILE_NOT_FOUND"
            ? "Report profile not found. Complete the full flow first."
            : json?.message ?? json?.error ?? "Checkout unavailable.";
        setCheckoutError(msg);
        setRedirecting(false);
        return;
      }
      const url = json?.data?.url ?? json?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
        return;
      }
      setCheckoutError("No checkout URL returned.");
    } catch {
      setCheckoutError("Could not start checkout. Try again.");
    } finally {
      setRedirecting(false);
    }
  }, [reportId, redirecting]);

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

  // Result confirmation + Use this with AI + Report ID — canonical source: lib/agent-instruction-copy
  const instructions = resolveInstructionsFromProfile(profile);
  const priorCopy = buildAgentInstructionText(instructions);

  return (
    <main
      className="min-h-screen overflow-y-auto font-sans"
      style={{
        background: "#050508",
        color: "rgba(255,255,255,0.75)",
      }}
    >
      {/* Result confirmation + Use this with AI + Report ID */}
      <div className="px-4 py-8 sm:px-6 sm:py-10 border-b border-white/[0.08] bg-[#050508] space-y-6">
        <div className="space-y-1">
          <h1 className="font-mono text-base sm:text-lg font-medium text-white" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
            WHOIS record generated.
          </h1>
          <p className="font-mono text-sm text-white/70" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
            Use with ANY AI.
          </p>
        </div>

        <div className="rounded-md border border-white/15 bg-black/50 p-5 mt-2">
            <button
              type="button"
              onClick={() => {
                if (priorCopy && navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(priorCopy).then(
                    () => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  );
                }
              }}
              className="inline-flex items-center justify-center px-4 py-2 rounded border border-white/20 bg-white/5 font-mono text-sm font-medium text-emerald-400/90 hover:bg-white/10 hover:border-white/30 cursor-pointer mb-2"
              style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
            >
              {copied ? "Copied" : "Click to copy"}
            </button>
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

        <div className="rounded-md border border-white/10 bg-black/50 p-5">
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
            <Link href="/whois-your-human/prior-format" className="text-emerald-400/90 hover:text-emerald-400 hover:underline">
              Prior format
            </Link>
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-black/50 p-5">
          <h3 className="font-mono text-sm text-white/90 mb-2" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
            Unlock full WHOIS access
          </h3>
          <p className="text-sm text-white/65 mb-4" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
            Payment unlocks the full access layer and entitlement token for AI tools.
          </p>
          {checkoutError && (
            <p className="text-xs text-amber-400/90 mb-3 font-mono">{checkoutError}</p>
          )}
          <button
            type="button"
            onClick={handleUnlockClick}
            disabled={redirecting}
            className="px-4 py-2 rounded border border-white/20 bg-white/5 font-mono text-sm text-white/90 hover:bg-white/10 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {redirecting ? "Redirecting…" : "Unlock access"}
          </button>
        </div>

        {(registryCount != null || stanceCounts != null) && (
          <div className="rounded-md border border-white/10 bg-black/50 p-5">
            <p className="text-[11px] uppercase tracking-wider text-white/55 mb-2">Protocol signal</p>
            {registryCount != null && (
              <p className="text-xs text-white/65 mb-2 font-mono" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
                Registry nodes recorded: {registryCount}
              </p>
            )}
            {stanceCounts != null && (
              <p className="text-xs text-white/65 font-mono" style={{ fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}>
                Agents evaluated: {stanceCounts.endorse + stanceCounts.decline + stanceCounts.abstain} — endorse: {stanceCounts.endorse}, decline: {stanceCounts.decline}, abstain: {stanceCounts.abstain}
              </p>
            )}
          </div>
        )}
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
