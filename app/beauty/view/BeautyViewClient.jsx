"use client";

/**
 * LOCKDOWN: Report display is WHOIS-first. Layout order: WHOIS Record → Registry Summary →
 * Field Conditions → Archetype Artifact → Deviations/Return to Coherence → Identity Artifacts → Share.
 * Do not reorder sections or change WHOIS block structure.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";
import { unwrapResponse } from "@/lib/unwrap-response";
import { fetchBlobPreviews } from "@/lib/api-client";
import PreviewCarousel from "./PreviewCarousel";
import EmotionalSnippet from "./EmotionalSnippet";
import WhoisReportSections from "./WhoisReportSections";
import RegistrySummary from "./RegistrySummary";
import ShareCard from "./ShareCard";
import ArchetypeArtifactCard, { buildArtifactsFromProfile } from "@/components/ArchetypeArtifactCard";
import { FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";

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

export default function BeautyViewClient() {
  const router = useRouter();
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
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [previewCards, setPreviewCards] = useState([]);
  const [previewsError, setPreviewsError] = useState("");
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState("");
  const [manualReportId, setManualReportId] = useState("");

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
    if (!reportId || typeof window === "undefined") return;
    const origin = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : window.location.origin;
    setShareUrl(`${origin}/beauty/view?reportId=${encodeURIComponent(reportId)}`);
  }, [reportId]);

  useEffect(() => {
    if (profile && reportId) track("beauty_view_loaded", reportId);
  }, [profile, reportId]);

  useEffect(() => {
    if (!urlChecked || reportId) return;
    setPreviewsLoading(true);
    setPreviewsError("");
    fetchBlobPreviews({ maxCards: 12, useBlob: true })
      .then(({ previewCards: cards }) => setPreviewCards(cards ?? []))
      .catch((err) => setPreviewsError(err?.message ?? "Failed to load reports"))
      .finally(() => setPreviewsLoading(false));
  }, [urlChecked, reportId]);

  const handleViewReport = useCallback(() => {
    const id = selectedPreviewId || manualReportId?.trim();
    if (!id) return;
    router.push(`/beauty/view?reportId=${encodeURIComponent(id)}`);
  }, [selectedPreviewId, manualReportId, router]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      track("beauty_share_copied", reportId);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [shareUrl, reportId]);

  // No reportId — Select report UI
  if (!urlChecked || (!reportId && !loading)) {
    return (
      <main className="beauty-theme beauty-page min-h-screen font-sans relative flex flex-col items-center justify-center px-6 py-24" style={{ background: "var(--beauty-cream, #fdf8f5)" }}>
        <div className="max-w-md w-full beauty-form-card rounded-3xl px-8 py-12 text-center space-y-6">
          <h1 className="beauty-heading text-xl beauty-text-inverse">Select a report</h1>
          {previewsLoading ? (
            <p className="beauty-body beauty-text-muted">Loading reports…</p>
          ) : previewsError ? (
            <p className="beauty-body text-sm beauty-text-muted">{previewsError}</p>
          ) : null}
          {!previewsLoading && (
            <>
              <div>
                <label htmlFor="report-select" className="sr-only">Choose a report</label>
                <select
                  id="report-select"
                  value={selectedPreviewId}
                  onChange={(e) => setSelectedPreviewId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[rgba(122,79,255,0.25)] bg-white/90 text-[var(--beauty-text)] focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/40"
                  aria-label="Select report"
                >
                  <option value="">— Choose a report —</option>
                  {previewCards.map((c) => (
                    <option key={c.reportId} value={c.reportId}>
                      {c.subjectName || "Report"} · {c.reportId}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="manual-report-id" className="beauty-body text-sm beauty-text-muted block text-left mb-1">Or enter report ID manually</label>
                <input
                  id="manual-report-id"
                  type="text"
                  value={manualReportId}
                  onChange={(e) => setManualReportId(e.target.value)}
                  placeholder="Report ID"
                  className="w-full p-3 rounded-xl border border-[rgba(122,79,255,0.25)] bg-white/90 text-[var(--beauty-text)] placeholder-[var(--beauty-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/40"
                />
              </div>
              <button
                type="button"
                onClick={handleViewReport}
                disabled={!selectedPreviewId && !manualReportId?.trim()}
                className="w-full px-6 py-3 rounded-full text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/50"
                style={{ backgroundColor: "#7A4FFF" }}
              >
                View report
              </button>
            </>
          )}
          <Link
            href="/origin"
            className="beauty-body text-sm font-medium text-[#7A4FFF] hover:underline block"
          >
            ← Back to Origin
          </Link>
        </div>
      </main>
    );
  }

  // Loading
  if (loading) {
    return (
      <main className="beauty-theme min-h-screen font-sans relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32 flex flex-col items-center justify-center">
        <div className="max-w-2xl mx-auto w-full beauty-form-card rounded-3xl px-8 py-16 text-center">
          <p className="beauty-body beauty-text-muted">Loading your Light Identity Report…</p>
        </div>
      </main>
    );
  }

  // Error (and not dryRun 404)
  if (error) {
    return (
      <main className="beauty-theme min-h-screen font-sans relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32 flex flex-col items-center justify-center">
        <div className="max-w-md mx-auto w-full beauty-form-card rounded-3xl px-8 py-12 text-center space-y-6">
          <p className="beauty-body text-lg beauty-text-inverse font-normal">{error}</p>
          <button
            type="button"
            onClick={loadProfile}
            className="beauty-body font-semibold text-[#7A4FFF] hover:underline focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/40 rounded-lg px-4 py-2"
          >
            Retry
          </button>
          <Link
            href="/origin"
            className="beauty-body font-semibold text-[#7A4FFF] hover:underline block"
          >
            Start Over
          </Link>
        </div>
      </main>
    );
  }

  // No profile (shouldn't normally hit if we have DRY_RUN)
  if (!profile) {
    return (
      <main className="beauty-theme beauty-page min-h-screen font-sans relative flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-md w-full beauty-form-card rounded-3xl px-8 py-12 text-center space-y-6">
          <p className="beauty-body text-lg beauty-text-inverse font-normal">Report not found.</p>
          <Link
            href="/origin"
            className="beauty-body font-semibold text-[#7A4FFF] hover:underline focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/40 rounded-lg px-4 py-2 inline-block"
          >
            Start Over
          </Link>
        </div>
      </main>
    );
  }

  const hasMajorFields = profile.light_signature != null || profile.vector_zero != null || profile.fullReport || profile.isExemplar;
  if (!hasMajorFields && profile.reportId !== "dry-run-preview") {
    return (
      <main className="beauty-theme min-h-screen font-sans relative flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-md w-full beauty-form-card rounded-3xl px-8 py-12 text-center space-y-6">
          <p className="beauty-body text-lg beauty-text-inverse font-normal">Report not found.</p>
          <Link href="/origin" className="beauty-body font-semibold text-[#7A4FFF] hover:underline inline-block">
            Start Over
          </Link>
        </div>
      </main>
    );
  }

  const heading = profile.subjectName || "Your Light Identity Report";
  const artifacts = buildArtifactsFromProfile(profile);

  function hasValue(v) {
    return v != null && v !== "" && String(v).trim() !== "" && v !== "—";
  }

  const whoisFields = [
    { label: "Record ID", value: profile.reportId, mono: true },
    { label: "Status", value: profile.isExemplar ? "Sample" : "Active" },
    { label: "Subject", value: artifacts.subjectName },
    { label: "Archetype", value: artifacts.archetype },
    { label: "Solar Season", value: artifacts.solarSeason },
    { label: "Declination", value: artifacts.declination },
    { label: "Anchor Type", value: artifacts.anchor },
    { label: "Cosmic Analogue", value: artifacts.cosmicAnalogue },
    { label: "Color Family", value: artifacts.colorFamily },
    { label: "Texture Bias", value: artifacts.textureBias },
  ].filter((f) => hasValue(f.value));

  return (
    <main className="beauty-theme min-h-screen font-sans relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32" style={{ background: "var(--beauty-cream, #fdf8f5)" }}>
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Back + Paid notice */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/origin"
            className="beauty-body text-sm font-medium text-[#7A4FFF] hover:underline flex items-center gap-2"
          >
            ← Back to Origin
          </Link>
          <p className="beauty-body text-sm beauty-text-muted">
            Paid / View Only — no checkout on this page
          </p>
        </div>

        {/* Header / emotional snippet */}
        <header className="text-center space-y-6">
          <p className="beauty-body text-xs uppercase tracking-widest beauty-text-muted" style={{ letterSpacing: "0.2em" }}>
            {profile.isExemplar ? "Sample Identity Record" : "Your Light Identity Report"}
          </p>
          <EmotionalSnippet snippet={profile.emotionalSnippet} subjectName={heading} />
        </header>

        {/* HUMAN WHOIS RECORD */}
        <section className="beauty-form-card rounded-3xl p-6 border-l-4 border-[#7A4FFF]">
          <h2 className="beauty-body text-xs font-bold uppercase tracking-widest beauty-text-muted mb-1" style={{ letterSpacing: "0.25em" }}>
            HUMAN WHOIS RECORD
          </h2>
          <p className="beauty-body text-xs beauty-text-muted mb-4">Registry: LIGS Identity Network</p>
          {whoisFields.length > 0 ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {whoisFields.map(({ label, value, mono }) => (
                <span key={label} className="contents">
                  <dt className="beauty-body beauty-text-muted font-medium">{label}</dt>
                  <dd className={`beauty-body beauty-text-inverse ${mono ? "font-mono" : ""}`}>{value}</dd>
                </span>
              ))}
            </dl>
          ) : null}
        </section>

        {/* Registry Summary — compact bridge between WHOIS and interpretation */}
        <RegistrySummary profile={profile} />

        {/* Field Conditions & Resolved Identity — before artifact */}
        {((!profile.isExemplar) || (profile.isExemplar && (profile.light_signature || profile.fullReport))) && (
          <WhoisReportSections profile={profile} isExemplar={profile.isExemplar} sections="identity" />
        )}

        {/* Archetype Artifact (hero + info panel) */}
        <section className="beauty-form-card rounded-3xl p-6">
          <h2 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4 text-center" style={{ letterSpacing: "0.2em" }}>
            Archetype Artifact
          </h2>
          <ArchetypeArtifactCard
            imageUrl={
              profile.isExemplar
                ? (profile.imageUrls?.[1] ?? profile.imageUrls?.[0] ?? profile.imageUrls?.[2] ?? profile.marketingCardUrl)
                : (profile.imageUrls?.[1] ?? profile.imageUrls?.[0] ?? profile.imageUrls?.[2])
            }
            archetype={profile.dominantArchetype}
            artifacts={buildArtifactsFromProfile(profile)}
            imageAlt={`Light Signature for ${heading}`}
            showGlyphOverlay={profile.isExemplar && profile.dominantArchetype === "Ignispectrum"}
          />
        </section>

        {/* Report interpretation — deviations + Return to Coherence */}
        {((!profile.isExemplar) || (profile.isExemplar && (profile.light_signature || profile.fullReport))) && (
          <WhoisReportSections profile={profile} isExemplar={profile.isExemplar} sections="interpretation" />
        )}

        {/* Identity Artifacts */}
        <section className="beauty-form-card rounded-3xl p-6">
          <h2 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4 text-center" style={{ letterSpacing: "0.2em" }}>
            Identity Artifacts
          </h2>
          <PreviewCarousel
            imageUrls={profile.imageUrls}
            subjectName={heading}
            labels={profile.isExemplar ? (profile.exemplarArtifactLabels ?? ["Vector Zero", "Light Signature", "Final Beauty Field"]) : undefined}
            hideEmptySlots={profile.isExemplar}
            glyphOverlayForIgnis={profile.isExemplar && profile.dominantArchetype === "Ignispectrum"}
          />
        </section>

        {/* Share Card */}
        <section className="space-y-4">
          <h2 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted text-center" style={{ letterSpacing: "0.2em" }}>
            Share Your Light Identity
          </h2>
          <ShareCard
            profile={profile}
            shareUrl={shareUrl}
            onCopyLink={handleCopyLink}
            copied={copied}
          />
        </section>

        <hr className="border-[var(--beauty-line)]/40" />

        <div className="mt-16 text-center">
          <Link
            href="/origin"
            onClick={() => track("beauty_start_over", reportId)}
            className="inline-block px-6 py-3 rounded-full text-white font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/50"
            style={{ backgroundColor: "#7A4FFF" }}
          >
            Start Over
          </Link>
        </div>

        <footer className="pt-8 text-center">
          <p className="beauty-body text-sm beauty-text-muted font-normal">
            {profile.isExemplar
              ? "Sample archetype record — not a personalized report."
              : "This report is generated uniquely for you using the LIGS engine."}
          </p>
        </footer>
      </div>
    </main>
  );
}
