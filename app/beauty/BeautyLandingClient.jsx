"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LandingPreviews from "@/components/LandingPreviews";
import LightIdentityForm from "@/components/LightIdentityForm";
import { isBeautyUnlocked, setBeautyUnlocked, getBeautyDraft, setBeautyDraft, saveLastFormData } from "@/lib/landing-storage";
import { FAKE_PAY, TEST_MODE } from "@/lib/dry-run-config";
import { fetchBlobPreviews } from "@/lib/api-client";
import { submitToBeautySubmit, submitToBeautyDryRun, prepurchaseBeautyDraft } from "@/lib/engine-client";

function getDryRunFromUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("dryRun") === "1" || params.get("dryRun") === "true";
}

const STATIC_SIGNATURE_BGS = [
  "/signatures/beauty-hero.png",
  "/signatures/beauty-hero1.png",
  "/signatures/beauty-background.png",
  "/signatures/vector-zero1.png",
];
const PAGE_BG_URL = "/signatures/beauty-background.png";

function isFormValid(formData) {
  if (!formData || typeof formData !== "object") return false;
  const n = (formData.name ?? "").trim();
  const d = (formData.birthDate ?? "").trim();
  const l = (formData.birthLocation ?? "").trim();
  const e = (formData.email ?? "").trim();
  return Boolean(n && d && l && e);
}

export default function BeautyLandingClient({ dryRun: dryRunProp = false }) {
  const [previewCards, setPreviewCards] = useState([]);
  const [liveTestStatus, setLiveTestStatus] = useState(null);
  const [liveTestError, setLiveTestError] = useState(null);
  const [ctaCheckoutLoading, setCtaCheckoutLoading] = useState(false);
  const [ctaCheckoutError, setCtaCheckoutError] = useState(null);
  const [alreadyPurchasedMessage, setAlreadyPurchasedMessage] = useState(null);
  const [formData, setFormData] = useState(null);
  const [generateLoading, setGenerateLoading] = useState(false);

  const formValid = isFormValid(formData);

  const router = useRouter();
  const searchParams = useSearchParams();
  const dryRun = dryRunProp || (typeof window !== "undefined" && getDryRunFromUrl());
  const isDev = process.env.NODE_ENV !== "production";
  const devParam = searchParams?.get?.("dev");
  const showDevControls = isDev && devParam === "1";

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setIsUnlocked(isBeautyUnlocked());
      const draft = getBeautyDraft();
      if (draft) setInitialFormData(draft);
    } catch {
      setIsUnlocked(false);
    }
  }, []);
  const unlocked = isUnlocked || dryRun;

  const handleFormDataChange = useCallback((data) => {
    setFormData(data);
  }, []);

  const isPlaceholder = (u) => !u || (typeof u === "string" && u.startsWith("data:image/svg+xml"));
  const firstRealPreviewImage =
    previewCards?.flatMap((c) => c.imageUrls || []).find((u) => !isPlaceholder(u));
  const finalBgUrl = firstRealPreviewImage || "/signatures/beauty-hero.png";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash === "#form") {
      const el = document.getElementById("form");
      el?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchBlobPreviews({ maxCards: 6, useBlob: true })
      .then(({ previewCards: cards }) => {
        if (!cancelled && Array.isArray(cards)) setPreviewCards(cards);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleLiveTestRun = useCallback(async () => {
    if (!isDev) return;
    setLiveTestError(null);
    setLiveTestStatus("Preflight…");
    try {
      const preRes = await fetch("/api/dev/preflight");
      const pre = await preRes.json();
      if (!pre.ok) {
        setLiveTestError(pre.checks?.summary ?? "Preflight failed");
        return;
      }
      setLiveTestStatus("Generating…");
      const res = await fetch("/api/dev/beauty-live-once", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setLiveTestError(data.error ?? "Live run failed");
        return;
      }
      const reportId = data.reportId;
      if (!reportId) {
        setLiveTestError("No reportId returned");
        return;
      }
      setLiveTestStatus("Verifying…");
      try {
        const verifyRes = await fetch(`/api/dev/verify-report?reportId=${encodeURIComponent(reportId)}`);
        const verify = await verifyRes.json();
        if (verify.ok) {
          console.log("[LiveTest] Verification PASS:", verify.summary, verify.checks);
        } else {
          console.warn("[LiveTest] Verification FAIL:", verify.summary, verify.checks);
        }
      } catch (e) {
        console.warn("[LiveTest] Verify request failed:", e);
      }
      setLiveTestStatus("Done. Navigating…");
      router.push(`/beauty/view?reportId=${encodeURIComponent(reportId)}`);
    } catch (err) {
      setLiveTestError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLiveTestStatus(null);
    }
  }, [isDev, router]);

  const handleHeroCta = useCallback(() => {
    const el = document.getElementById("form");
    el?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const runGenerate = useCallback(
    async (data) => {
      setGenerateLoading(true);
      setCtaCheckoutError(null);
      setAlreadyPurchasedMessage(null);
      try {
        const result = dryRun
          ? await submitToBeautyDryRun(data)
          : await submitToBeautySubmit(data);
        const reportId = result?.reportId;
        if (!reportId) {
          setCtaCheckoutError("Generation failed: No report ID returned.");
          return;
        }
        saveLastFormData(reportId, data);
        router.push(`/beauty/view?reportId=${encodeURIComponent(reportId)}`);
      } catch (err) {
        const msg = err?.message ?? "Something went wrong";
        setCtaCheckoutError(`Generation failed: ${msg}`);
      } finally {
        setGenerateLoading(false);
      }
    },
    [dryRun, router]
  );

  const handleCtaPrimary = useCallback(async () => {
    console.log("[CTA] clicked", { unlocked, TEST_MODE, formValid });
    if (!formValid || !formData) return;

    if (unlocked || TEST_MODE) {
      await runGenerate(formData);
      return;
    }
    if (FAKE_PAY) {
      console.log("FAKE PAY MODE – no charge made");
      setBeautyUnlocked();
      await runGenerate(formData);
      return;
    }

    setCtaCheckoutError(null);
    setAlreadyPurchasedMessage(null);
    setBeautyDraft(formData);
    setCtaCheckoutLoading(true);
    try {
      let draftId = null;
      try {
        const prep = await prepurchaseBeautyDraft(formData);
        draftId = prep?.draftId ?? null;
      } catch (e) {
        console.warn("[Prepurchase] server draft failed, using localStorage fallback:", e?.message);
      }
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prePurchase: true, ...(draftId && { draftId }) }),
      });
      const json = await res.json();
      if (!res.ok) {
        const errMsg = json?.error ?? "Checkout unavailable. Try again later.";
        const displayMsg =
          errMsg === "STRIPE_NOT_CONFIGURED"
            ? "Stripe not configured. Add STRIPE_SECRET_KEY to enable checkout."
            : errMsg;
        setCtaCheckoutError(displayMsg);
        return;
      }
      const url = json?.data?.url ?? json?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
      } else {
        setCtaCheckoutError("No checkout URL returned.");
      }
    } catch (err) {
      setCtaCheckoutError("Could not start checkout. Please try again.");
    } finally {
      setCtaCheckoutLoading(false);
    }
  }, [unlocked, formValid, formData, runGenerate]);

  const handleAlreadyPurchased = useCallback(() => {
    console.log("[CTA] clicked", { unlocked, TEST_MODE, formValid });
    if (unlocked || TEST_MODE) {
      const el = document.getElementById("form");
      el?.scrollIntoView({ behavior: "smooth" });
    } else {
      setAlreadyPurchasedMessage("Please purchase first to access the form.");
      const el = document.getElementById("form");
      el?.scrollIntoView({ behavior: "smooth" });
    }
  }, [unlocked]);

  const sectionClass =
    "relative px-6 sm:px-16 lg:px-32 py-24 sm:py-32 border-t border-[var(--beauty-line,#e8e4e8)] bg-transparent";
  const textClass = "text-lg leading-relaxed font-normal beauty-body";
  const headingClass = "text-2xl sm:text-3xl font-semibold tracking-wide beauty-heading";
  const mutedClass = "beauty-text-muted";

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
      {finalBgUrl && (
        <div
          className="absolute inset-x-0 top-0 h-[520px] pointer-events-none"
          style={{
            backgroundImage: `url(${finalBgUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />
      )}
      {finalBgUrl && (
        <div
          className="absolute inset-x-0 top-0 h-[520px] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.0) 55%, rgba(255,255,255,1.0) 100%)",
          }}
        />
      )}
      <div className="relative z-10">
        <main className="beauty-theme beauty-page min-h-screen relative">
      {/* Hero */}
      <section
        className={`${sectionClass} min-h-[80vh] flex flex-col justify-center relative overflow-hidden`}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${PAGE_BG_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.4) 100%)",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div
            className="relative overflow-hidden text-white [&_a]:text-white [&_a:hover]:opacity-90"
            style={{
              display: "inline-block",
              padding: "24px 32px",
              borderRadius: "28px",
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 100%), url(${PAGE_BG_URL})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
          >
            <h1
              className={`${headingClass} text-4xl sm:text-5xl lg:text-6xl mb-6`}
              style={{ letterSpacing: "0.02em" }}
            >
              <a
                href="https://ligs.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-inherit no-underline hover:opacity-90 transition-opacity"
              >
                (L)igs
              </a>
            </h1>
            <p className={`${textClass} max-w-xl mx-auto mb-6`}>
              A new scientific field for understanding how physical forces shape
              identity.
            </p>
            <p className={`${textClass} max-w-xl mx-auto mb-6`}>
              Your biology, your behavior, and your inner architecture are not
              random. They are the result of visible and invisible forces that
              imprint a unique Light Signature at birth — a pattern that stays with
              you for life.
            </p>
            <p className={`${textClass} max-w-xl mx-auto mb-6`}>
              LIGS reveals that pattern. The Light Identity Report interprets it.
            </p>
            <button
              type="button"
              onClick={handleHeroCta}
              className="inline-flex items-center text-[#c9b8ff] text-base font-medium transition-all duration-300 hover:opacity-90 cursor-pointer bg-transparent border-none p-0 font-inherit"
            >
              Begin your Light Identity Report →
            </button>
          </div>
        </div>
      </section>

      {/* What is LIGS */}
      <section className={sectionClass}>
        <div className="max-w-3xl mx-auto space-y-8 text-center">
          <h2 className={headingClass} style={{ letterSpacing: "0.02em" }}>
            What is LIGS?
          </h2>
          <p className={textClass}>
            LIGS is a scientific framework that studies how forces — light,
            gravity, cosmic influences, tidal fields, and environmental
            conditions — interact with biological systems to shape identity.
          </p>
          <p className={textClass}>
            Every person is born with a unique Light Signature — a structural
            pattern formed by cosmic, environmental, and biological forces at the
            moment of initialization.
          </p>
        </div>
      </section>

      {/* Why it matters */}
      <section className={sectionClass}>
        <div className="max-w-3xl mx-auto space-y-8 text-center">
          <h2 className={headingClass} style={{ letterSpacing: "0.02em" }}>
            Why it matters
          </h2>
          <p className={textClass}>
            Most systems describe who you are after the fact. LIGS identifies
            the structure beneath it.
          </p>
          <p className={textClass}>
            Your Light Signature reveals the patterns that drive your
            decisions, relationships, strengths, and blind spots.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className={sectionClass}>
        <div className="max-w-3xl mx-auto space-y-8 text-center">
          <h2 className={headingClass} style={{ letterSpacing: "0.02em" }}>
            How it works
          </h2>
          <p className={textClass}>
            LIGS analyzes the full environment of forces present at the moment
            your biology initializes — light, gravity, tidal fields, celestial
            mechanics, and the broader cosmic environment.
          </p>
          <p className={textClass}>
            Every report is generated in real time. No templates. No recycled
            interpretations.
          </p>
        </div>
      </section>

      {/* Previous Light Identity Reports / Examples */}
      <LandingPreviews
        maxCards={6}
        useBlob={true}
        variant="beauty"
        initialCards={previewCards}
      />

      {/* Get your Light Signature — form + CTA (always visible) */}
      <section id="form" className={`${sectionClass} border-[var(--beauty-line,#e8e4e8)]/30`}>
        <div className="max-w-2xl mx-auto space-y-8 text-center">
          <h2 className={headingClass} style={{ letterSpacing: "0.02em" }}>
            Get your Light Signature
          </h2>
          <ul className={`${textClass} text-left max-w-md mx-auto space-y-3 list-disc list-inside`}>
            <li>Shareable Light Signature card (downloadable)</li>
            <li>3 signature images (Vector Zero / Light Signature / Final Field)</li>
            <li>Full narrative report (Raw Signal / Custodian / Oracle)</li>
          </ul>
          {!unlocked && (
            <p className="text-2xl font-semibold beauty-heading">
              $39.99
            </p>
          )}
          {unlocked && (
            <p className="text-sm beauty-text-muted">
              <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-medium">Unlocked</span>
              {" "}— Generate your report.
            </p>
          )}
          <div className="max-w-xl mx-auto text-left">
            <LightIdentityForm
              hideSubmitButton
              showOptionalNotes
              initialFormData={initialFormData}
              onFormDataChange={handleFormDataChange}
            />
          </div>
          {ctaCheckoutError && (
            <p className="text-red-600 text-sm">{ctaCheckoutError}</p>
          )}
          {alreadyPurchasedMessage && (
            <p className="text-amber-700 text-sm bg-amber-50 px-4 py-2 rounded-lg">{alreadyPurchasedMessage}</p>
          )}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleCtaPrimary}
                disabled={!formValid || ctaCheckoutLoading || generateLoading}
                className="px-8 py-4 bg-[#7A4FFF] text-white text-base font-semibold rounded-xl hover:bg-[#8b5fff] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {ctaCheckoutLoading
                  ? "Redirecting…"
                  : generateLoading
                    ? "Generating…"
                    : formValid && (unlocked || TEST_MODE)
                      ? "Generate my report"
                      : formValid
                        ? "Buy now ($39.99)"
                        : "Continue"}
              </button>
              <a
                href="#examples"
                className="text-sm beauty-text-muted hover:text-[#7A4FFF] transition-colors"
              >
                See examples
              </a>
            </div>
            {!formValid && (
              <p className="text-sm beauty-text-muted">Complete the form to continue.</p>
            )}
            <button
              type="button"
              onClick={handleAlreadyPurchased}
              className="text-sm beauty-text-muted hover:text-[#7A4FFF] transition-colors underline"
            >
              Already purchased? Enter your details →
            </button>
          </div>
        </div>
      </section>

      {/* Dev-only: Live test run (save to blob) — never in production */}
      {process.env.NODE_ENV !== "production" && showDevControls && (
        <section className={`${sectionClass} border-t border-amber-200/50 bg-amber-50/30`}>
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <p className="text-xs uppercase tracking-widest text-amber-800/80 font-medium">
              Dev: Live pipeline test
            </p>
            <button
              type="button"
              onClick={handleLiveTestRun}
              disabled={!!liveTestStatus}
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {liveTestStatus ?? "LIVE TEST RUN (save to blob)"}
            </button>
            {liveTestError && (
              <p className="text-sm text-red-600">{liveTestError}</p>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={sectionClass}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <a
            href="https://ligs.io"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs ${mutedClass} uppercase tracking-widest font-medium hover:opacity-80 transition-colors`}
            style={{ letterSpacing: "0.2em" }}
          >
            LIGS — Light Identity System
          </a>
          <p className={`text-xs ${mutedClass} font-light`}>
            A scientific identity framework ·{" "}
            <a
              href="https://ligs.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7A4FFF]/80 hover:text-[#7A4FFF] transition-colors"
            >
              ligs.io
            </a>
          </p>
        </div>
      </footer>
        </main>
      </div>
    </div>
  );
}
