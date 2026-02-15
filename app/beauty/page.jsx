"use client";

import { useState, useEffect } from "react";
import { track } from "@/lib/analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LightIdentityForm from "@/components/LightIdentityForm";
import LigsFooter from "@/components/LigsFooter";
import { submitToEngine, submitToEve } from "@/lib/engine-client";
import { unwrapResponse } from "@/lib/unwrap-response";

const IMAGERY_KEYS = ["vector_zero_beauty_field", "light_signature_aesthetic_field", "final_beauty_field"];

/** Expected /api/eve fields; used to log missing/undefined for mapping fixes. */
function logMissingBeautyFields(profile) {
  if (!profile) return;
  const missing = [];
  const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const paths = [
    "vector_zero.three_voice.raw_signal",
    "vector_zero.three_voice.custodian",
    "vector_zero.three_voice.oracle",
    "vector_zero.beauty_baseline.color_family",
    "vector_zero.beauty_baseline.texture_bias",
    "vector_zero.beauty_baseline.shape_bias",
    "vector_zero.beauty_baseline.motion_bias",
    "light_signature.raw_signal",
    "light_signature.custodian",
    "light_signature.oracle",
    "archetype.raw_signal",
    "archetype.custodian",
    "archetype.oracle",
    "deviations.raw_signal",
    "deviations.custodian",
    "deviations.oracle",
    "corrective_vector.raw_signal",
    "corrective_vector.custodian",
    "corrective_vector.oracle",
    "imagery_prompts.vector_zero_beauty_field",
    "imagery_prompts.light_signature_aesthetic_field",
    "imagery_prompts.final_beauty_field",
  ];
  for (const path of paths) {
    const value = get(profile, path);
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      missing.push(path);
    }
  }
  if (missing.length > 0) {
    console.warn("[Beauty Profile] Missing or empty fields (check API mapping):", missing);
  }
}

export default function BeautyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const [lastBeautyProfile, setLastBeautyProfile] = useState(null);
  const [imageUrls, setImageUrls] = useState({});
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(null);
  const [demoData, setDemoData] = useState({
    imageUrl: "/beauty-preview.png",
    subjectName: "Demo",
    reportExcerpt: "Your Beauty Signature — demo excerpt (no API).",
    fullReport: "Full report placeholder (no API call).",
  });
  const [showFullReport, setShowFullReport] = useState(false);

  useEffect(() => {
    track("beauty_entry_page");
  }, []);

  useEffect(() => {
    setDemoLoading(true);
    fetch("/api/beauty/demo")
      .then((res) => unwrapResponse(res))
      .then((data) => setDemoData(data))
      .catch((err) => {
        console.error("API error", err);
        setDemoError(err.message ?? "Demo failed");
      })
      .finally(() => setDemoLoading(false));
  }, []);

  useEffect(() => {
    if (lastBeautyProfile) logMissingBeautyFields(lastBeautyProfile);
  }, [lastBeautyProfile]);

  useEffect(() => {
    const prompts = lastBeautyProfile?.imagery_prompts;
    if (!prompts) {
      setImageUrls({});
      setImageErrors({});
      return;
    }
    let cancelled = false;
    setImagesLoading(true);
    setImageErrors({});
    const next = {};
    const errs = {};
    const reportId = lastBeautyProfile?.reportId ?? null;
    Promise.all(
      IMAGERY_KEYS.map(async (key) => {
        const prompt = prompts[key];
        if (!prompt) return;
        try {
          const res = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, reportId, slug: key }),
          });
          const data = await unwrapResponse(res);
          if (cancelled) return;
          if (data.url) next[key] = data.url;
        } catch (e) {
          if (!cancelled) {
            console.error("API error", e);
            errs[key] = e.message || "Request failed";
          }
        }
      })
    ).then(() => {
      if (!cancelled) {
        setImageUrls(next);
        setImageErrors(errs);
        setImagesLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [lastBeautyProfile?.imagery_prompts]);

  const handleFormSubmit = async (formData, options = {}) => {
    setLoading(true);
    setError(null);
    setLastReport(null);
    setLastBeautyProfile(null);
    setImageUrls({});
    setImageErrors({});
    try {
      if (options.dryRun === true) {
        const data = await submitToEngine(formData, { dryRun: true });
        setLastReport(data);
      } else {
        const data = await submitToEve(formData);
        setLastBeautyProfile(data);
      }
    } catch (err) {
      const message =
        err.name === "AbortError"
          ? "Request timed out. Try again."
          : (err.message || "Something went wrong");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="beauty-theme beauty-page light-writing-page min-h-screen font-sans relative bg-transparent">
      {/* Report generating — overlay with graphic so user knows to wait */}
      {loading && (
        <div className="beauty-loading-overlay" role="status" aria-live="polite" aria-label="Generating your Beauty Signature">
          <div className="beauty-loading-content">
            <div className="beauty-loading-graphic">
              <div className="ring" aria-hidden />
              <div className="orb" aria-hidden />
            </div>
            <p className="title">Generating your Beauty Signature</p>
            <p className="sub">Please wait. This may take a minute.</p>
          </div>
        </div>
      )}

      <div style={{ position: "relative" }}>
      {/* Soft landing — Stage 1 */}
      <section className="relative px-6 sm:px-16 lg:px-32 py-32 flex flex-col items-center justify-center text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="beauty-heading text-3xl sm:text-4xl lg:text-5xl tracking-wide beauty-text-inverse">
            Begin Your Light Identity Sequence
          </h1>
          <p className="beauty-body text-lg beauty-text-muted font-normal">
            A personalized identity field generated from your biological, emotional, and cosmic signatures.
          </p>
          <p className="beauty-body text-base beauty-text-inverse font-normal leading-relaxed">
            Your Light Identity Report reveals the coherence, resonance, and archetype that shape how you move through the world — the structure beneath your beauty.
          </p>
          <div>
            <Link
              href="#start"
              className="inline-block px-6 py-3.5 bg-[#7A4FFF] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/50"
            >
              Start the Sequence
            </Link>
          </div>
        </div>
      </section>

      {/* Hero — with orb, texture, and LIGS-inspired lines */}
      <section className="relative px-6 sm:px-16 lg:px-32 pt-32 pb-24 min-h-[40vh] flex flex-col justify-center">
        {/* Soft orb behind hero text */}
        <div
          className="beauty-orb w-[280px] sm:w-[360px] h-[280px] sm:h-[360px] -top-20 left-1/2 -translate-x-1/2"
          style={{
            background: "radial-gradient(circle, var(--beauty-orb-glow) 0%, transparent 70%)",
          }}
          aria-hidden
        />

        {/* Very subtle micro-sparkle / texture behind hero */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, rgba(122, 79, 255, 0.15) 0%, transparent 50%),
                             radial-gradient(circle at 80% 70%, rgba(255, 182, 193, 0.12) 0%, transparent 50%)`,
          }}
        />

        {/* Thin white lines / circles — LIGS forces & balance reference */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none beauty-deco-line"
          style={{ opacity: 0.35 }}
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <circle cx="200" cy="200" r="120" fill="none" stroke="var(--beauty-line)" strokeWidth="0.5" />
          <circle cx="200" cy="200" r="80" fill="none" stroke="var(--beauty-line)" strokeWidth="0.4" />
          <line x1="200" y1="80" x2="200" y2="320" stroke="var(--beauty-line)" strokeWidth="0.4" />
          <line x1="80" y1="200" x2="320" y2="200" stroke="var(--beauty-line)" strokeWidth="0.4" />
          <line x1="120" y1="120" x2="280" y2="280" stroke="var(--beauty-line)" strokeWidth="0.35" />
          <line x1="280" y1="120" x2="120" y2="280" stroke="var(--beauty-line)" strokeWidth="0.35" />
        </svg>

        <div className="relative max-w-3xl mx-auto text-center z-10">
          <h1 className="beauty-heading text-4xl sm:text-5xl lg:text-6xl tracking-wide leading-[1.15] mb-6 beauty-text-inverse">
            Beauty
          </h1>
          <p className="beauty-body text-lg beauty-text-muted max-w-xl mx-auto font-normal">
            Your Beauty Signature begins here.
          </p>
        </div>
      </section>

      {/* Hero image — centered, responsive */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: "2rem",
          paddingBottom: "2rem",
        }}
      >
        <img
          src="/beauty-hero.png"
          alt="Beauty"
          style={{
            maxWidth: "900px",
            width: "100%",
            height: "auto",
            objectFit: "cover",
            borderRadius: "8px",
          }}
        />
      </div>

      {/* Manifesto body — rounded container, soft shadow */}
      <section className="relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32">
        <div
          className="max-w-2xl mx-auto rounded-3xl px-8 sm:px-12 py-12 sm:py-16 beauty-form-card"
        >
          <div
            className="beauty-body text-lg beauty-text-inverse font-normal whitespace-pre-line"
            style={{ letterSpacing: "0.01em" }}
          >
            {`Beauty is not subjective.
Beauty is not a vote.
Beauty is not what people think of you.

Beauty is the state your body enters when you feel safe, balanced, and alive.

Beauty is coherent aliveness.
Corruption is distorted aliveness.

Beauty appears when your system is calm, open, and steady.
Corruption appears when everything inside feels too loud, too tight, or too much.

None of this is your fault.
It started before you even knew yourself.

The way people responded to you —
their faces, their voices, their warmth, their distance —
shaped how your body learned to feel.

If the world felt safe, you grew toward balance.
If the world felt chaotic, you grew toward protection.

This is why beauty feels deeper than looks.
Because it is deeper.

Beauty is not a face.
Beauty is a state.

You cannot change the forces that formed you,
but you can change your state.

E.V.E. shows you your starting state —
your Beauty Signature —
the imprint left by the forces that shaped your development.

And she teaches you how to shift:
toward balance,
toward calm,
toward coherence,
toward beauty.

Beauty is not something you perform.
Beauty is something you return to.
Beauty is the state your system was always trying to reach.`}
          </div>
        </div>
      </section>

      {/* Demo Beauty Signature — historical figure (Leonardo da Vinci), above user form */}
      <section className="relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32">
        <div className="max-w-2xl mx-auto space-y-8 text-center">
          <h2 className="beauty-heading text-2xl sm:text-3xl tracking-wide beauty-text-inverse">
            Demo Beauty Signature
          </h2>
          <p className="beauty-body text-base beauty-text-muted font-normal">
            A sample reading using public birth data — no form submission.
          </p>

          {demoLoading && (
            <div className="beauty-form-card rounded-3xl px-8 py-16">
              <p className="beauty-body beauty-text-muted">Loading demo…</p>
            </div>
          )}

          {demoError && !demoLoading && (
            <div className="beauty-form-card rounded-3xl px-8 py-8 border border-amber-200/50 bg-amber-50/50">
              <p className="beauty-body text-amber-800/90">{demoError}</p>
            </div>
          )}

          {demoData && !demoLoading && (
            <div className="space-y-8">
              {demoData.imageUrl && (
                <div className="rounded-3xl overflow-hidden shadow-lg beauty-form-card p-4 sm:p-6">
                  <img
                    src={demoData.imageUrl}
                    alt={`Beauty Signature for ${demoData.subjectName ?? "demo"}`}
                    className="w-full max-w-lg mx-auto rounded-2xl object-cover aspect-square"
                  />
                </div>
              )}
              <div className="beauty-form-card rounded-3xl px-8 sm:px-12 py-10 text-left">
                <p className="beauty-body text-sm beauty-text-muted mb-4">
                  {demoData.subjectName}
                </p>
                <div className="beauty-body text-lg beauty-text-inverse font-normal whitespace-pre-line leading-relaxed">
                  {showFullReport ? demoData.fullReport : demoData.reportExcerpt}
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullReport((v) => !v)}
                  className="mt-6 text-[#7A4FFF] font-medium text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/40 rounded-lg"
                >
                  {showFullReport ? "Show less" : "View Full Report"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Begin Your Beauty Signature — form section with rounded card (Stage 2) */}
      <section
        id="start"
        className="relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32"
        aria-label="Begin Your Beauty Signature"
      >
        <div className="max-w-xl mx-auto space-y-8 text-center">
          <h2 className="beauty-heading text-2xl sm:text-3xl tracking-wide beauty-text-inverse">
            Begin Your Beauty Signature
          </h2>
          <div>
            <p className="beauty-body text-lg beauty-text-muted font-normal mb-2">
              Your Beauty Signature Starts Here
            </p>
            <p className="beauty-body text-base beauty-text-muted font-normal opacity-90">
              Enter your information to receive your Beauty Signature reading.
            </p>
          </div>
          {error && (
            <div className="p-4 rounded-2xl border border-[#FF3B3B]/30 bg-[#FF3B3B]/10 text-[#c92a2a] font-light text-sm text-left shadow-sm">
              {error}
            </div>
          )}
          <div className="text-left beauty-form-card rounded-3xl p-8 sm:p-10">
            <LightIdentityForm
              onSubmit={handleFormSubmit}
              showOptionalNotes={true}
              submitButtonLabel="Get full report (API)"
              showDryRunButton={true}
            />
          </div>
        </div>
      </section>

      {/* Full Beauty Report (E.V.E. output) — shown when full report was requested */}
      {lastBeautyProfile && (
        <section
          className="relative px-6 sm:px-16 lg:px-32 py-16 sm:py-24 border-t border-[var(--beauty-line)]/30"
          id="beauty-full-report"
          aria-label="Your Beauty Signature — Full Report"
        >
          <div className="max-w-3xl mx-auto space-y-12">
            <h2 className="beauty-heading text-2xl sm:text-3xl font-bold tracking-wide beauty-text-inverse text-center">
              Your Beauty Signature — Full Report
            </h2>
            <p className="beauty-body text-base font-semibold beauty-text-muted text-center">
              E.V.E. filter output. All sections in 3-voice structure.
            </p>
            {lastBeautyProfile.reportId && (
              <p className="text-center">
                <button
                  type="button"
                  onClick={() => router.push(`/?reportId=${encodeURIComponent(lastBeautyProfile.reportId)}`)}
                  className="text-[#7A4FFF] font-bold text-base hover:underline"
                >
                  View full LIGS report on home →
                </button>
              </p>
            )}

            {/* Vector Zero — three_voice + beauty_baseline (all fields) */}
            <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
              <h3 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4" style={{ letterSpacing: "0.2em" }}>Vector Zero</h3>
              <div className="space-y-4 text-base font-semibold">
                <p><span className="beauty-text-muted">Raw signal:</span> <span className="beauty-text-inverse">{lastBeautyProfile.vector_zero?.three_voice?.raw_signal ?? "—"}</span></p>
                <p><span className="beauty-text-muted">Custodian:</span> <span className="beauty-text-inverse">{lastBeautyProfile.vector_zero?.three_voice?.custodian ?? "—"}</span></p>
                <p><span className="beauty-text-muted">Oracle:</span> <span className="beauty-text-inverse">{lastBeautyProfile.vector_zero?.three_voice?.oracle ?? "—"}</span></p>
                <div className="mt-4 pt-4 border-t border-[var(--beauty-line)]/30 space-y-2">
                  <p><span className="beauty-text-muted">Beauty baseline · Color family:</span> <span className="beauty-text-inverse">{lastBeautyProfile.vector_zero?.beauty_baseline?.color_family ?? "—"}</span></p>
                  <p><span className="beauty-text-muted">Beauty baseline · Texture bias:</span> <span className="beauty-text-inverse">{lastBeautyProfile.vector_zero?.beauty_baseline?.texture_bias ?? "—"}</span></p>
                  <p><span className="beauty-text-muted">Beauty baseline · Shape bias:</span> <span className="beauty-text-inverse">{lastBeautyProfile.vector_zero?.beauty_baseline?.shape_bias ?? "—"}</span></p>
                  <p><span className="beauty-text-muted">Beauty baseline · Motion bias:</span> <span className="beauty-text-inverse">{lastBeautyProfile.vector_zero?.beauty_baseline?.motion_bias ?? "—"}</span></p>
                </div>
              </div>
            </div>

            {/* Light Signature */}
            <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
              <h3 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4" style={{ letterSpacing: "0.2em" }}>Light Signature</h3>
              <div className="space-y-4 text-base font-semibold">
                <p><span className="beauty-text-muted">Raw signal:</span> <span className="beauty-text-inverse">{lastBeautyProfile.light_signature?.raw_signal ?? "—"}</span></p>
                <p><span className="beauty-text-muted">Custodian:</span> <span className="beauty-text-inverse">{lastBeautyProfile.light_signature?.custodian ?? "—"}</span></p>
                <p><span className="beauty-text-muted">Oracle:</span> <span className="beauty-text-inverse">{lastBeautyProfile.light_signature?.oracle ?? "—"}</span></p>
              </div>
            </div>

            {/* Archetype */}
            <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
              <h3 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4" style={{ letterSpacing: "0.2em" }}>Archetype</h3>
              <div className="space-y-4 text-base font-semibold">
                <p><span className="beauty-text-muted">Raw signal:</span> <span className="beauty-text-inverse">{lastBeautyProfile.archetype?.raw_signal ?? "—"}</span></p>
                <p><span className="beauty-text-muted">Custodian:</span> <span className="beauty-text-inverse">{lastBeautyProfile.archetype?.custodian ?? "—"}</span></p>
                <p><span className="beauty-text-muted">Oracle:</span> <span className="beauty-text-inverse">{lastBeautyProfile.archetype?.oracle ?? "—"}</span></p>
              </div>
            </div>

            {/* Deviations */}
            <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
              <h3 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4" style={{ letterSpacing: "0.2em" }}>Deviations</h3>
              <div className="space-y-4 text-base font-semibold">
                <p><span className="beauty-text-muted">Raw signal:</span> <span className="beauty-text-inverse">{lastBeautyProfile.deviations?.raw_signal ?? "—"}</span></p>
                <p><span className="beauty-text-muted">Custodian:</span> <span className="beauty-text-inverse">{lastBeautyProfile.deviations?.custodian ?? "—"}</span></p>
                <p><span className="beauty-text-muted">Oracle:</span> <span className="beauty-text-inverse">{lastBeautyProfile.deviations?.oracle ?? "—"}</span></p>
              </div>
            </div>

            {/* Corrective Vector */}
            <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
              <h3 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4" style={{ letterSpacing: "0.2em" }}>Corrective Vector</h3>
              <div className="space-y-4 text-base font-semibold">
                <p><span className="beauty-text-muted">Raw signal:</span> <span className="beauty-text-inverse">{lastBeautyProfile.corrective_vector?.raw_signal ?? "—"}</span></p>
                <p><span className="beauty-text-muted">Custodian:</span> <span className="beauty-text-inverse">{lastBeautyProfile.corrective_vector?.custodian ?? "—"}</span></p>
                <p><span className="beauty-text-muted">Oracle:</span> <span className="beauty-text-inverse">{lastBeautyProfile.corrective_vector?.oracle ?? "—"}</span></p>
              </div>
            </div>

            {/* E.V.E. Imagery Prompts + Rendered Images — all three fields always shown */}
            <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
              <h3 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4" style={{ letterSpacing: "0.2em" }}>Imagery</h3>
              <ul className="space-y-8">
                <li className="border-b border-[var(--beauty-line)]/30 pb-8">
                  <p className="beauty-body text-sm font-bold beauty-text-muted mb-2">vector_zero_beauty_field</p>
                  <p className="beauty-body text-base beauty-text-inverse font-semibold leading-relaxed mb-4">{lastBeautyProfile.imagery_prompts?.vector_zero_beauty_field ?? "—"}</p>
                  {imagesLoading && !imageUrls.vector_zero_beauty_field && !imageErrors.vector_zero_beauty_field && lastBeautyProfile.imagery_prompts?.vector_zero_beauty_field && <p className="beauty-body text-sm beauty-text-muted">Generating image…</p>}
                  {imageErrors.vector_zero_beauty_field && <p className="beauty-body text-sm text-[#c92a2a]">{imageErrors.vector_zero_beauty_field}</p>}
                  {imageUrls.vector_zero_beauty_field && <img src={imageUrls.vector_zero_beauty_field} alt="Vector Zero Beauty Field" className="w-full max-w-lg rounded-2xl shadow-lg object-cover aspect-square" />}
                </li>
                <li className="border-b border-[var(--beauty-line)]/30 pb-8">
                  <p className="beauty-body text-sm font-bold beauty-text-muted mb-2">light_signature_aesthetic_field</p>
                  <p className="beauty-body text-base beauty-text-inverse font-semibold leading-relaxed mb-4">{lastBeautyProfile.imagery_prompts?.light_signature_aesthetic_field ?? "—"}</p>
                  {imagesLoading && !imageUrls.light_signature_aesthetic_field && !imageErrors.light_signature_aesthetic_field && lastBeautyProfile.imagery_prompts?.light_signature_aesthetic_field && <p className="beauty-body text-sm beauty-text-muted">Generating image…</p>}
                  {imageErrors.light_signature_aesthetic_field && <p className="beauty-body text-sm text-[#c92a2a]">{imageErrors.light_signature_aesthetic_field}</p>}
                  {imageUrls.light_signature_aesthetic_field && <img src={imageUrls.light_signature_aesthetic_field} alt="Light Signature Aesthetic Field" className="w-full max-w-lg rounded-2xl shadow-lg object-cover aspect-square" />}
                </li>
                <li className="pb-0">
                  <p className="beauty-body text-sm font-bold beauty-text-muted mb-2">final_beauty_field</p>
                  <p className="beauty-body text-base beauty-text-inverse font-semibold leading-relaxed mb-4">{lastBeautyProfile.imagery_prompts?.final_beauty_field ?? "—"}</p>
                  {imagesLoading && !imageUrls.final_beauty_field && !imageErrors.final_beauty_field && lastBeautyProfile.imagery_prompts?.final_beauty_field && <p className="beauty-body text-sm beauty-text-muted">Generating image…</p>}
                  {imageErrors.final_beauty_field && <p className="beauty-body text-sm text-[#c92a2a]">{imageErrors.final_beauty_field}</p>}
                  {imageUrls.final_beauty_field && <img src={imageUrls.final_beauty_field} alt="Final Beauty Field" className="w-full max-w-lg rounded-2xl shadow-lg object-cover aspect-square" />}
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Tester: report summary, tests, imagery — below the form */}
      <section
        className="relative px-6 sm:px-16 lg:px-32 py-16 sm:py-24 border-t border-[var(--beauty-line)]/30"
        id="tester-block"
        aria-label="Tester output"
      >
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="beauty-heading text-2xl sm:text-3xl font-bold tracking-wide beauty-text-inverse text-center">
            Tester — Report &amp; imagery
          </h2>
          <p className="beauty-body text-base font-semibold beauty-text-muted text-center max-w-xl mx-auto">
            Summary, test status, and imagery from the last report. Submit the form above to populate.
          </p>

          {/* Summary */}
          <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
            <h3 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4" style={{ letterSpacing: "0.2em" }}>
              Summary
            </h3>
            {lastBeautyProfile ? (
              <div className="space-y-4 text-base font-semibold">
                <p><span className="beauty-text-muted">Source:</span> <span className="beauty-text-inverse">E.V.E. Beauty Profile (full report)</span></p>
                {lastBeautyProfile.reportId && (
                  <p><span className="beauty-text-muted">Report ID:</span> <code className="bg-black/10 px-1.5 py-0.5 rounded text-[var(--beauty-text)] break-all font-semibold">{lastBeautyProfile.reportId}</code></p>
                )}
                <p><span className="beauty-text-muted">Sections:</span> vector_zero, light_signature, archetype, deviations, corrective_vector, imagery</p>
              </div>
            ) : lastReport ? (
              <div className="space-y-4 text-base font-semibold">
                <p><span className="beauty-text-muted">Source:</span> <span className="beauty-text-inverse">Dry run (no API)</span></p>
                <p><span className="beauty-text-muted">Report ID:</span> <code className="bg-black/10 px-1.5 py-0.5 rounded text-[var(--beauty-text)] break-all font-semibold">{lastReport.reportId ?? "—"}</code></p>
                {lastReport.emotional_snippet && (
                  <p><span className="beauty-text-muted">Snippet:</span> <span className="beauty-text-inverse font-semibold">{lastReport.emotional_snippet}</span></p>
                )}
                <p>
                  <span className="beauty-text-muted">Vector Zero:</span> {lastReport.vector_zero != null ? "yes" : "no"}
                  {lastReport.image_prompts?.length != null && (
                    <> · <span className="beauty-text-muted">Image prompts:</span> {lastReport.image_prompts.length}</>
                  )}
                </p>
              </div>
            ) : (
              <p className="beauty-body text-base font-semibold beauty-text-muted">No report yet. Use Dry run or Get full report above.</p>
            )}
          </div>

          {/* Report tests */}
          <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
            <h3 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4" style={{ letterSpacing: "0.2em" }}>
              Report tests
            </h3>
            <p className="beauty-body text-base font-semibold beauty-text-muted mb-3">
              E.V.E. filter test (optional, when running locally): run in terminal from <code className="bg-black/10 px-1.5 py-0.5 rounded font-semibold">project root</code>:
            </p>
            <pre className="bg-black/15 rounded-xl p-4 text-sm font-bold text-[var(--beauty-text)] overflow-x-auto">
              npm run test:run
            </pre>
            <p className="beauty-body text-base font-semibold beauty-text-muted mt-4">
              Output appears in the terminal (Beauty Profile JSON). API routes are not called.
            </p>
          </div>

          {/* Imagery */}
          <div className="beauty-form-card rounded-3xl px-6 sm:px-8 py-6 text-left">
            <h3 className="beauty-body text-sm font-bold uppercase tracking-widest beauty-text-muted mb-4" style={{ letterSpacing: "0.2em" }}>
              Imagery
            </h3>
            {lastBeautyProfile?.imagery_prompts ? (
              <ul className="space-y-6">
                {lastBeautyProfile.imagery_prompts.vector_zero_beauty_field && (
                  <li className="border-b border-[var(--beauty-line)]/30 pb-6">
                    <p className="beauty-body text-sm font-bold beauty-text-muted mb-2">Vector Zero Beauty Field</p>
                    <p className="beauty-body text-base beauty-text-inverse font-semibold leading-relaxed mb-3">{lastBeautyProfile.imagery_prompts.vector_zero_beauty_field}</p>
                    {imageUrls.vector_zero_beauty_field && <img src={imageUrls.vector_zero_beauty_field} alt="Vector Zero Beauty Field" className="w-full max-w-md rounded-xl shadow-lg object-cover aspect-square" />}
                  </li>
                )}
                {lastBeautyProfile.imagery_prompts.light_signature_aesthetic_field && (
                  <li className="border-b border-[var(--beauty-line)]/30 pb-6">
                    <p className="beauty-body text-sm font-bold beauty-text-muted mb-2">Light Signature Aesthetic Field</p>
                    <p className="beauty-body text-base beauty-text-inverse font-semibold leading-relaxed mb-3">{lastBeautyProfile.imagery_prompts.light_signature_aesthetic_field}</p>
                    {imageUrls.light_signature_aesthetic_field && <img src={imageUrls.light_signature_aesthetic_field} alt="Light Signature Aesthetic Field" className="w-full max-w-md rounded-xl shadow-lg object-cover aspect-square" />}
                  </li>
                )}
                {lastBeautyProfile.imagery_prompts.final_beauty_field && (
                  <li className="pb-0">
                    <p className="beauty-body text-sm font-bold beauty-text-muted mb-2">Final Beauty Field</p>
                    <p className="beauty-body text-base beauty-text-inverse font-semibold leading-relaxed mb-3">{lastBeautyProfile.imagery_prompts.final_beauty_field}</p>
                    {imageUrls.final_beauty_field && <img src={imageUrls.final_beauty_field} alt="Final Beauty Field" className="w-full max-w-md rounded-xl shadow-lg object-cover aspect-square" />}
                  </li>
                )}
              </ul>
            ) : lastReport?.image_prompts?.length ? (
              <ul className="space-y-4">
                {lastReport.image_prompts.map((prompt, i) => (
                  <li key={i} className="border-b border-[var(--beauty-line)]/30 pb-4 last:border-0 last:pb-0">
                    <p className="beauty-body text-sm font-bold beauty-text-muted mb-2">Prompt {i + 1}</p>
                    <p className="beauty-body text-base beauty-text-inverse font-semibold leading-relaxed">{prompt}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="beauty-body text-base font-semibold beauty-text-muted">No imagery yet. Use Dry run or Get full report above.</p>
            )}
          </div>
        </div>
      </section>

      {/* Footer — soft, rounded */}
      <footer className="relative px-6 sm:px-16 lg:px-32 py-16">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 beauty-text-muted text-xs uppercase tracking-widest font-medium" style={{ letterSpacing: "0.2em" }}>
          <p>Beauty — E.V.E.</p>
          <p className="font-light">Your Beauty Signature begins here.</p>
        </div>
      </footer>
      <LigsFooter />
      </div>
    </main>
  );
}
