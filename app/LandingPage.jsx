"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import LightIdentityForm from "@/components/LightIdentityForm";
import { submitToEngine } from "@/lib/engine-client";
import { unwrapResponse } from "@/lib/unwrap-response";

const BACKGROUND_IMAGE_URL = "https://dka9ns5uuh3ltho4.public.blob.vercel-storage.com/form%20background.png";

export default function Home() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [fullReport, setFullReport] = useState(null);
  const [loadingFullReport, setLoadingFullReport] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // When landing with ?reportId= (e.g. from Beauty form submit), load and show that report
  useEffect(() => {
    const reportId = searchParams.get("reportId");
    if (!reportId || result?.reportId === reportId) return;
    let cancelled = false;
    const load = async () => {
      setLoadingFullReport(true);
      try {
        const res = await fetch(`/api/report/${reportId}`);
        const data = await unwrapResponse(res);
        if (cancelled) return;
        setResult({
          reportId,
          emotional_snippet: data.emotional_snippet ?? "",
          image_prompts: data.image_prompts ?? [],
          vector_zero: data.vector_zero ?? undefined,
        });
        setFullReport(data.full_report ?? "");
      } catch (err) {
        if (!cancelled) {
          console.error("API error", err);
          setError("Report not found. It may still be processing.");
        }
      } finally {
        if (!cancelled) setLoadingFullReport(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [searchParams, result?.reportId]);

  const handleFormSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setFullReport(null);
    try {
      const data = await submitToEngine(formData);
      setResult(data);
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

  const handleViewFullReport = async (reportIdOverride) => {
    const reportId = reportIdOverride || result?.reportId;
    if (!reportId) return;
    setLoadingFullReport(true);
    setFullReport(null);
    try {
      const res = await fetch(`/api/report/${reportId}`);
      const data = await unwrapResponse(res);
      setFullReport(data.full_report ?? "");
    } catch (err) {
      console.error("API error", err);
      setError(err.message);
    } finally {
      setLoadingFullReport(false);
    }
  };

  return (
    <main className="light-writing-page min-h-screen font-sans relative bg-transparent">
      {/* Background — fixed full-viewport image */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          overflow: "hidden",
        }}
      >
        <img
          src={BACKGROUND_IMAGE_URL}
          alt=""
          style={{
            height: "100vh",
            width: "auto",
            objectFit: "contain",
            objectPosition: "top center",
          }}
        />
      </div>

      {/* Vector field overlay */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.12, zIndex: 0 }}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <style>{`@keyframes drift { 0% { transform: translate(0,0); } 100% { transform: translate(15px,15px); } }`}</style>
        </defs>
        <path d="M100,200 Q300,150 500,200 T900,200" stroke="#7A4FFF" strokeWidth="0.5" fill="none" opacity="0.25" />
        <path d="M200,300 Q400,250 600,300 T1000,300" stroke="#7A4FFF" strokeWidth="0.5" fill="none" opacity="0.2" />
        <path d="M300,100 Q400,300 300,500" stroke="#FF3B3B" strokeWidth="0.5" fill="none" opacity="0.2" />
        <path d="M500,50 Q600,200 500,350 Q400,500 500,650" stroke="#7A4FFF" strokeWidth="0.5" fill="none" opacity="0.18" />
        <ellipse cx="400" cy="300" rx="150" ry="80" stroke="#7A4FFF" strokeWidth="0.5" fill="none" opacity="0.15" transform="rotate(45 400 300)" />
        <ellipse cx="800" cy="400" rx="120" ry="100" stroke="#FF3B3B" strokeWidth="0.5" fill="none" opacity="0.15" transform="rotate(-30 800 400)" />
      </svg>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col justify-center px-6 sm:px-16 lg:px-32 pt-32 pb-24" style={{ zIndex: 10 }}>
        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="light-write text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-wide leading-[1.1] mb-6" style={{ letterSpacing: "0.02em" }}>
            <a href="https://ligs.io" target="_blank" rel="noopener noreferrer" className="text-inherit no-underline hover:opacity-90 transition-opacity">
              (L)igs
            </a>
          </h1>
          <p className="text-lg text-[#F5F5F5]/80 max-w-xl mx-auto leading-relaxed mb-6 font-normal">
            A new scientific field for understanding how physical forces shape identity.
          </p>
          <p className="text-lg text-[#F5F5F5]/80 max-w-xl mx-auto leading-relaxed mb-6 font-normal">
            Your biology, your behavior, and your inner architecture are not random.
            They are the result of visible and invisible forces that imprint a unique Light Signature at birth — a pattern that stays with you for life.
          </p>
          <p className="text-lg text-[#F5F5F5]/80 max-w-xl mx-auto leading-relaxed mb-6 font-normal">
            LIGS reveals that pattern. The Light Identity Report interprets it.
          </p>
          <a
            href="#section-5"
            className="inline-flex items-center text-[#7A4FFF] text-base font-medium transition-all duration-300"
            style={{ textShadow: "0 0 0 rgba(122, 79, 255, 0)" }}
          >
            Begin your Light Identity Report →
          </a>
        </div>
      </section>

      {/* What is LIGS */}
      <section className="relative px-6 sm:px-16 lg:px-32 py-32 border-t border-[#0A0F1C] bg-transparent" style={{ zIndex: 10 }}>
        <div className="max-w-3xl mx-auto space-y-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-wide text-[#F5F5F5]" style={{ letterSpacing: "0.02em" }}>
            What is LIGS?
          </h2>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal">
            LIGS is a scientific framework that studies how forces — light, gravity, cosmic influences, tidal fields, and environmental conditions — interact with biological systems to shape identity.
          </p>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal">
            Every person is born with a unique Light Signature — a structural pattern formed by cosmic, environmental, and biological forces at the moment of initialization.
          </p>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal">
            This signature influences how you think, adapt, connect, and move through the world. LIGS measures that pattern. The Light Identity Report translates it into language you can use.
          </p>
        </div>
      </section>

      {/* Why it matters */}
      <section className="relative px-6 sm:px-16 lg:px-32 py-32 border-t border-[#0A0F1C] bg-transparent" style={{ zIndex: 10 }}>
        <div className="max-w-3xl mx-auto space-y-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-wide text-[#F5F5F5]" style={{ letterSpacing: "0.02em" }}>
            Why it matters
          </h2>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal">
            Most systems describe who you are after the fact. LIGS identifies the structure beneath it.
          </p>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal">
            Your Light Signature reveals the patterns that drive your decisions, relationships, strengths, and blind spots. It shows the forces you work with — and the ones you work against.
          </p>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal">
            Understanding this pattern gives you clarity. Using it gives you leverage.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-6 sm:px-16 lg:px-32 py-32 border-t border-[#0A0F1C] bg-transparent" style={{ zIndex: 10 }}>
        <div className="max-w-3xl mx-auto space-y-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-wide text-[#F5F5F5]" style={{ letterSpacing: "0.02em" }}>
            How it works
          </h2>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal">
            LIGS analyzes the full environment of forces present at the moment your biology initializes — light, gravity, tidal fields, celestial mechanics, and the broader cosmic environment.
          </p>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal">
            These interacting forces form a structural pattern called your Light Signature. The Light Identity Report maps this pattern across twelve archetypal expressions, showing how your signature shapes your instincts, strengths, challenges, and modes of adaptation.
          </p>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal">
            Every report is generated in real time. No templates. No recycled interpretations.
          </p>
        </div>
      </section>

      {/* Begin your report — form */}
      <section id="section-5" className="relative px-6 sm:px-16 lg:px-32 py-32 border-t border-[#0A0F1C]/30 bg-transparent" style={{ zIndex: 10 }}>
        <div className="max-w-3xl mx-auto space-y-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-wide text-[#F5F5F5]" style={{ letterSpacing: "0.02em" }}>
            Begin your Light Identity Report
          </h2>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal">
            Your Light Signature is already active. LIGS gives you the structure to understand it.
          </p>
          <p className="text-lg text-[#F5F5F5]/80 leading-relaxed font-normal mb-12">
            The Light Identity Report is a real‑time analysis of your signature across twelve archetypal expressions, built from the forces present at your initialization.
          </p>
          {error && (
            <div className="mb-6 p-4 border border-[#FF3B3B]/50 bg-[#FF3B3B]/10 text-[#FF3B3B] font-light text-sm">
              {error}
            </div>
          )}
          <div className="max-w-xl mx-auto">
            <LightIdentityForm onSubmit={handleFormSubmit} showOptionalNotes={true} />
          </div>

          {/* Output summary — test instructions + latest report summary */}
          <div className="mt-16 pt-8 border-t border-[#0A0F1C]/50 max-w-2xl mx-auto text-left">
            <p className="text-xs uppercase tracking-widest text-[#F5F5F5]/50 mb-3" style={{ letterSpacing: "0.2em" }}>
              Output summary
            </p>
            <div className="text-sm text-[#F5F5F5]/70 font-light space-y-2">
              <p>
                <span className="text-[#7A4FFF]/90">Test:</span> Run in terminal from <code className="bg-[#0A0F1C]/60 px-1.5 py-0.5 text-[#F5F5F5]/80">project root</code>: <code className="bg-[#0A0F1C]/60 px-1.5 py-0.5 text-[#F5F5F5]/80">npm run test:run</code> — E.V.E. filter test and Beauty Profile JSON will print there.
              </p>
              {result ? (
                <p>
                  <span className="text-[#7A4FFF]/90">Latest report:</span>{" "}
                  <code className="bg-[#0A0F1C]/60 px-1.5 py-0.5 text-[#F5F5F5]/80">{result.reportId ?? "—"}</code>
                  {result.emotional_snippet ? ` — "${String(result.emotional_snippet).slice(0, 80)}${result.emotional_snippet.length > 80 ? "…" : ""}"` : ""}
                  {result.vector_zero != null ? " · Vector Zero: yes" : ""}
                  {result.image_prompts?.length != null ? ` · Image prompts: ${result.image_prompts.length}` : ""}
                </p>
              ) : (
                <p>
                  <span className="text-[#7A4FFF]/90">Latest report:</span> None yet. Submit the form above to generate a report; the summary will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Results — API output */}
      {result && (
        <section id="report" className="relative px-6 sm:px-16 lg:px-32 py-32 border-t border-[#0A0F1C] bg-transparent" style={{ zIndex: 10 }}>
          <div className="max-w-xl mx-auto space-y-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-wide text-[#F5F5F5]" style={{ letterSpacing: "0.02em" }}>
              Your Light Identity — Preview
            </h2>
            <div className="p-6 border border-[#0A0F1C] bg-[#0A0F1C]/50">
              <p className="text-xs uppercase tracking-widest text-[#7A4FFF] mb-3" style={{ letterSpacing: "0.2em" }}>
                Summary
              </p>
              <p className="text-lg text-[#F5F5F5] leading-relaxed font-light italic">
                {result.emotional_snippet ?? "—"}
              </p>
            </div>
            {result.image_prompts && result.image_prompts.length > 0 && (
              <div className="space-y-6">
                <p className="text-xs uppercase tracking-widest text-[#7A4FFF]" style={{ letterSpacing: "0.2em" }}>
                  Imagery Prompts
                </p>
                <div className="grid gap-6">
                  {result.image_prompts.map((prompt, i) => (
                    <div
                      key={i}
                      className="min-h-[200px] border border-[#0A0F1C] flex items-center justify-center p-6 bg-[#0A0F1C]/30"
                      style={{ borderRadius: 0 }}
                    >
                      <p className="text-sm text-[#F5F5F5]/60 text-center font-light max-w-md">
                        [Image {i + 1}] — {String(prompt ?? "").slice(0, 120)}…
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.reportId && (
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-widest text-[#7A4FFF]" style={{ letterSpacing: "0.2em" }}>
                  Full report
                </p>
                {fullReport === null ? (
                  <button
                    type="button"
                    onClick={() => handleViewFullReport()}
                    disabled={loadingFullReport}
                    className="px-6 py-3 border border-[#7A4FFF] text-[#7A4FFF] text-sm font-medium transition-all duration-300 disabled:opacity-50 hover:bg-[#7A4FFF]/10"
                    style={{ borderRadius: 0 }}
                  >
                    {loadingFullReport ? "Loading…" : "View full report"}
                  </button>
                ) : (
                  <div
                    className="p-6 border border-[#0A0F1C] bg-[#0A0F1C]/30 max-h-[60vh] overflow-y-auto font-light text-[#F5F5F5]/90 leading-relaxed whitespace-pre-wrap text-left"
                    style={{ borderRadius: 0 }}
                  >
                    {fullReport}
                  </div>
                )}
              </div>
            )}
            <div className="pt-8 border-t border-[#0A0F1C]">
              <p className="text-[#F5F5F5]/60 mb-4 font-light">
                Unlock your full Light Identity Report. Pay with Stripe to receive the complete report via email or download.
              </p>
              <button
                type="button"
                className="px-8 py-3.5 bg-[#FF3B3B] text-white text-sm font-semibold transition-all duration-300 hover:bg-[#ff5252]"
                style={{ borderRadius: 0 }}
              >
                Pay to Unlock Full Report
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setResult(null); setFullReport(null); setError(null); }}
              className="text-sm text-[#F5F5F5]/60 hover:text-[#F5F5F5] font-light underline"
            >
              Generate another report
            </button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative px-6 sm:px-16 lg:px-32 py-16 border-t border-[#0A0F1C] bg-transparent" style={{ zIndex: 10 }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <a
            href="https://ligs.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#F5F5F5]/40 uppercase tracking-widest font-medium hover:text-[#F5F5F5]/70 transition-colors"
            style={{ letterSpacing: "0.2em" }}
          >
            LIGS — Light Identity System
          </a>
          <p className="text-xs text-[#F5F5F5]/40 font-light">
            A scientific identity framework ·{" "}
            <a href="https://ligs.io" target="_blank" rel="noopener noreferrer" className="text-[#7A4FFF]/80 hover:text-[#7A4FFF] transition-colors">
              ligs.io
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
