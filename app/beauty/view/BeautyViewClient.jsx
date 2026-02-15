"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";
import { unwrapResponse } from "@/lib/unwrap-response";

// Later: detect user auth or purchase state
const isPublic = true;

function ThreeVoiceSection({ title, voice }) {
  if (!voice) return null;
  return (
    <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
      <h3 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4" style={{ letterSpacing: "0.2em" }}>
        {title}
      </h3>
      <div className="space-y-4 text-base font-semibold">
        <p><span className="beauty-text-muted">Raw signal:</span> <span className="beauty-text-inverse">{voice.raw_signal ?? "—"}</span></p>
        <p><span className="beauty-text-muted">Custodian:</span> <span className="beauty-text-inverse">{voice.custodian ?? "—"}</span></p>
        <p><span className="beauty-text-muted">Oracle:</span> <span className="beauty-text-inverse">{voice.oracle ?? "—"}</span></p>
      </div>
    </div>
  );
}

export default function BeautyViewClient() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/beauty/${encodeURIComponent(reportId)}`);
      const data = await unwrapResponse(res);
      setProfile(data);
    } catch (err) {
      console.error("API error", err);
      setError(err.message ?? "Unable to load your report.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (!reportId) return;
    loadProfile();
  }, [reportId, loadProfile]);

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

  if (!reportId) {
    return (
      <main className="beauty-theme min-h-screen font-sans relative flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-md w-full beauty-form-card rounded-3xl px-8 py-12 text-center">
          <p className="beauty-body text-lg beauty-text-inverse font-normal">
            Missing report ID.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="beauty-theme min-h-screen font-sans relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32 flex flex-col items-center justify-center">
        <div className="max-w-2xl mx-auto w-full beauty-form-card rounded-3xl px-8 py-16 text-center">
          <p className="beauty-body beauty-text-muted">Loading your Light Identity Report…</p>
        </div>
      </main>
    );
  }

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
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  // Public mode: never render email, birthDate, birthTime, birthLocation, timings, or internal metadata
  const hasMajorFields = profile.light_signature != null || profile.vector_zero != null;
  if (!hasMajorFields) {
    return (
      <main className="beauty-theme min-h-screen font-sans relative flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-md w-full beauty-form-card rounded-3xl px-8 py-12 text-center space-y-6">
          <p className="beauty-body text-lg beauty-text-inverse font-normal">
            This Light Identity Report is not available.
          </p>
          <Link
            href="/"
            className="beauty-body font-semibold text-[#7A4FFF] hover:underline focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/40 rounded-lg px-4 py-2 inline-block"
          >
            Return to LIGS Home
          </Link>
        </div>
      </main>
    );
  }

  const heading = profile.subjectName || "Your Light Identity Report";
  const firstImageUrl = profile.imageUrls?.[0];

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

  return (
    <main className="beauty-theme min-h-screen font-sans relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32">
      <div className="max-w-3xl mx-auto space-y-10">
        {isPublic && (
          <p className="beauty-body text-sm beauty-text-muted text-center">
            This is the public version of a Light Identity Report.
          </p>
        )}
        <header className="text-center space-y-4">
          <h1 className="beauty-heading text-2xl sm:text-3xl lg:text-4xl tracking-wide beauty-text-inverse">
            {heading}
          </h1>
          {profile.emotionalSnippet && (
            <p className="beauty-body text-lg beauty-text-inverse font-normal max-w-2xl mx-auto">
              {profile.emotionalSnippet}
            </p>
          )}
        </header>

        <section className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 space-y-4">
          <h2 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted" style={{ letterSpacing: "0.2em" }}>
            Share Your Light Identity Report
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              readOnly
              value={shareUrl}
              aria-label="Public report URL"
              className="beauty-body text-sm beauty-text-inverse bg-transparent border border-[var(--beauty-line)]/50 rounded-xl px-4 py-3 flex-1 min-w-0"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!shareUrl}
              className="beauty-body font-semibold text-[#7A4FFF] hover:underline focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/40 rounded-xl px-4 py-3 flex-shrink-0 disabled:opacity-50"
            >
              Copy Link
            </button>
          </div>
          {copied && (
            <p className="beauty-body text-sm beauty-text-muted">Link copied.</p>
          )}
        </section>

        {firstImageUrl && (
          <div className="space-y-2">
            <p className="beauty-body text-sm font-semibold uppercase tracking-widest beauty-text-muted text-center">
              Primary Aesthetic Field Image
            </p>
            <div className="rounded-3xl overflow-hidden shadow-lg beauty-form-card p-4 sm:p-6">
              <img
                src={firstImageUrl}
                alt={`Beauty Signature for ${heading}`}
                className="w-full max-w-lg mx-auto rounded-2xl object-cover aspect-square"
              />
            </div>
          </div>
        )}

        {profile.imageUrls && profile.imageUrls.length > 1 && (
          <div className="flex gap-4 overflow-x-auto py-4">
            {profile.imageUrls.map((url, i) => (
              <span key={i} className="flex-shrink-0">
                <img src={url} alt="" className="h-48 rounded-lg shadow" />
              </span>
            ))}
          </div>
        )}

        <hr className="border-beauty-muted my-12" />

        <ThreeVoiceSection title="Light Signature" voice={profile.light_signature} />
        <ThreeVoiceSection title="Archetype" voice={profile.archetype} />
        <ThreeVoiceSection title="Deviations" voice={profile.deviations} />
        <ThreeVoiceSection title="Corrective Vector" voice={profile.corrective_vector} />

        <hr className="border-beauty-muted my-12" />

        {profile.imagery_prompts && (
          <section className="space-y-6">
            <h2 className="beauty-heading text-xl sm:text-2xl tracking-wide beauty-text-inverse text-center">
              Aesthetic Fields
            </h2>
            <div className="space-y-6">
              {profile.imagery_prompts.vector_zero_beauty_field && (
                <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
                  <p className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-3" style={{ letterSpacing: "0.2em" }}>
                    Vector Zero Beauty Field
                  </p>
                  <p className="beauty-body text-base beauty-text-inverse font-semibold leading-relaxed">
                    {profile.imagery_prompts.vector_zero_beauty_field}
                  </p>
                </div>
              )}
              {profile.imagery_prompts.light_signature_aesthetic_field && (
                <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
                  <p className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-3" style={{ letterSpacing: "0.2em" }}>
                    Light Signature Aesthetic Field
                  </p>
                  <p className="beauty-body text-base beauty-text-inverse font-semibold leading-relaxed">
                    {profile.imagery_prompts.light_signature_aesthetic_field}
                  </p>
                </div>
              )}
              {profile.imagery_prompts.final_beauty_field && (
                <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
                  <p className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-3" style={{ letterSpacing: "0.2em" }}>
                    Final Beauty Field
                  </p>
                  <p className="beauty-body text-base beauty-text-inverse font-semibold leading-relaxed">
                    {profile.imagery_prompts.final_beauty_field}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <hr className="border-beauty-muted my-12" />

        <div className="mt-16 text-center">
          <Link
            href="/beauty"
            onClick={() => track("beauty_start_over", reportId)}
            className="inline-block px-6 py-3 rounded-full text-white font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/50"
            style={{ backgroundColor: "#7A4FFF" }}
          >
            Start Over
          </Link>
        </div>

        <footer className="pt-8 text-center">
          <p className="beauty-body text-sm beauty-text-muted font-normal">
            This report is generated uniquely for you using the LIGS engine.
          </p>
        </footer>
      </div>
    </main>
  );
}
