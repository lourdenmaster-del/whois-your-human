"use client";

/* DO NOT REFORMAT. Copy/spacing sensitive. */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LandingPreviews from "@/components/LandingPreviews";
import LightIdentityForm from "@/components/LightIdentityForm";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import { isBeautyUnlocked, setBeautyUnlocked, getBeautyDraft, setBeautyDraft, saveLastFormData } from "@/lib/landing-storage";
import { FAKE_PAY, TEST_MODE } from "@/lib/dry-run-config";
import { submitToBeautySubmit, submitToBeautyDryRun, prepurchaseBeautyDraft } from "@/lib/engine-client";
import { useApiStatus } from "@/hooks/useApiStatus";
import { IGNIS_LANDING_URL } from "@/lib/exemplar-store";
import { getArchetypePreviewConfig } from "@/lib/archetype-preview-config";

const IGNIS_ARCHETYPE = "Ignispectrum";

// True waitlist-only: no purchase CTA, no maintenance blocker. Set NEXT_PUBLIC_WAITLIST_ONLY=0 to re-enable purchase flow.
const WAITLIST_ONLY =
  process.env.NEXT_PUBLIC_WAITLIST_ONLY !== "0";

function getDryRunFromUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("dryRun") === "1" || params.get("dryRun") === "true";
}

/* ligs-logo.jpeg used for page, hero section, and hero text panel — NOT ligs-landing-bg */

function isFormValid(formData) {
  if (!formData || typeof formData !== "object") return false;
  const n = (formData.name ?? "").trim();
  const d = (formData.birthDate ?? "").trim();
  const l = (formData.birthLocation ?? "").trim();
  const e = (formData.email ?? "").trim();
  return Boolean(n && d && l && e);
}

export default function BeautyLandingClient({ dryRun: dryRunProp = false, initialManifests = null }) {
  const [ctaCheckoutLoading, setCtaCheckoutLoading] = useState(false);
  const [ctaCheckoutError, setCtaCheckoutError] = useState(null);
  const [alreadyPurchasedMessage, setAlreadyPurchasedMessage] = useState(null);
  const [formData, setFormData] = useState(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [exemplarManifests, setExemplarManifests] = useState(initialManifests ?? []);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState(null);

  const formValid = isFormValid(formData);

  const router = useRouter();
  const [dryRunFromUrl, setDryRunFromUrl] = useState(false);
  useEffect(() => {
    setDryRunFromUrl(typeof window !== "undefined" && getDryRunFromUrl());
  }, []);
  const dryRun = dryRunProp || dryRunFromUrl;

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

  const { disabled: apiDisabled } = useApiStatus();

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
    if (initialManifests != null && initialManifests.length > 0) return;
    let cancelled = false;
    fetch(`/api/exemplars?version=v1`)
      .then((res) => (res.ok ? res.json() : { manifests: [] }))
      .then((data) => {
        if (cancelled) return;
        setExemplarManifests(data.manifests ?? []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [initialManifests]);

  const handleHeroCta = useCallback(() => {
    const el = document.getElementById("form");
    el?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleWaitlistSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const email = (waitlistEmail ?? "").trim().toLowerCase();
      if (!email) return;
      setWaitlistError(null);
      setWaitlistLoading(true);
      try {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: "origin" }),
        });
        const data = await res.json();
        if (!res.ok) {
          setWaitlistError(data?.error ?? "Something went wrong. Try again.");
          return;
        }
        setWaitlistSuccess(true);
        setWaitlistEmail("");
      } catch {
        setWaitlistError("Something went wrong. Try again.");
      } finally {
        setWaitlistLoading(false);
      }
    },
    [waitlistEmail]
  );

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
    if (process.env.NODE_ENV === "development") console.log("[CTA] clicked", { unlocked, TEST_MODE, formValid });
    if (!formValid || !formData) return;

    if (unlocked || TEST_MODE) {
      await runGenerate(formData);
      return;
    }
    if (FAKE_PAY) {
      if (process.env.NODE_ENV === "development") console.log("FAKE PAY MODE – no charge made");
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
        if (process.env.NODE_ENV === "development") console.warn("[Prepurchase] server draft failed, using localStorage fallback:", e?.message);
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
    if (process.env.NODE_ENV === "development") console.log("[CTA] clicked", { unlocked, TEST_MODE, formValid });
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

  const ignisDescriptor = getMarketingDescriptor(IGNIS_ARCHETYPE);
  const ignisArchetypeImagePath = getArchetypePreviewConfig(IGNIS_ARCHETYPE).archetypeStaticImagePath;

  return (
    <div className="origin-landing relative min-h-screen">
      {/* Dedicated page bg layer — reliable on iOS Safari (avoids background-attachment:fixed) */}
      <div className="origin-page-bg" aria-hidden />
      <div className="relative z-[1]">
        <main className="origin-landing beauty-theme beauty-page min-h-screen relative">
      {/* Hero — texture is page bg; hero panel has logo watermark behind text only */}
      <section
        className={`${sectionClass} min-h-[80vh] flex flex-col justify-center relative overflow-hidden`}
      >
        <div className="relative z-10 max-w-3xl mx-auto text-center px-4 sm:px-6">
          <div className="hero-panel relative inline-block text-left w-full max-w-2xl" style={{ padding: "20px 16px", borderRadius: "20px", boxShadow: "0 12px 40px rgba(0,0,0,0.4)", background: "rgba(0,0,0,0.35)" }}>
            {/* Logo watermark — <img> for iOS Safari visibility (background-image unreliable) */}
            <img
              src="/ligs-logo.jpeg"
              alt=""
              width={1086}
              height={724}
              className="hero-watermark-img"
              loading="eager"
              decoding="async"
              aria-hidden
            />
            {/* Hero text — above watermark (z-2 so above watermark + scrim) */}
            <div className="relative" style={{ zIndex: 2 }}>
            <h1
              className={`${headingClass} mb-2 hero-headline`}
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
            <p className="text-xl sm:text-2xl font-medium tracking-wide beauty-heading text-[var(--beauty-text,#0d0b10)] mb-6 max-w-xl mx-auto">
              (L)igs — The physics of you.
            </p>
            <p className={`${textClass} hero-subhead max-w-xl mx-auto mb-6`}>
              A new scientific framework exploring how physical forces present at
              birth shape identity.
            </p>
            <p className={`${textClass} hero-subhead max-w-xl mx-auto mb-6`}>
              Your biology, behavior, and inner architecture are not random.
              They emerge from physical forces present at birth that imprint a
              unique Light Signature — a pattern that stays with you for life.
            </p>
            <p className={`${textClass} max-w-xl mx-auto mb-6 hero-subhead`}>
              LIGS reveals that pattern. The Light Identity Report interprets it.
            </p>
            <button
              type="button"
              onClick={handleHeroCta}
              className="inline-flex items-center text-[#c9b8ff] text-base font-medium transition-all duration-300 hover:opacity-90 cursor-pointer bg-transparent border-none p-0 font-inherit"
            >
              Begin your Light Identity Report →
            </button>
            <p className={`${textClass} mt-3 text-sm opacity-90 max-w-xl mx-auto`}>
              Discover the pattern written into your birth moment.
            </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ignis exemplar + 3 benefit bullets */}
      <section className={sectionClass}>
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
            <div className="flex-shrink-0 w-full md:max-w-sm">
              <div className="aspect-[4/3] overflow-hidden rounded-lg border border-[var(--beauty-line,#e8e4e8)] bg-[#0A0F1C]/5 relative">
                <img
                  src={IGNIS_LANDING_URL}
                  alt=""
                  className="relative z-[1] w-full h-full object-cover"
                />
                {ignisArchetypeImagePath && (
                  <img
                    src={ignisArchetypeImagePath}
                    alt=""
                    aria-hidden
                    className="archetype-static-image-overlay"
                  />
                )}
              </div>
              <p className="mt-3 text-xs uppercase tracking-widest text-[#7A4FFF] font-medium">
                {IGNIS_ARCHETYPE}
              </p>
              <p className={`text-sm ${mutedClass} font-light italic mt-1`}>
                &ldquo;{ignisDescriptor.tagline}&rdquo;
              </p>
            </div>
            <div className="flex-1 space-y-4">
              <h2 className={headingClass} style={{ letterSpacing: "0.02em" }}>
                Your Light Signature in three ways
              </h2>
              <ul className={`${textClass} space-y-3`}>
                <li className="flex gap-3">
                  <span className="text-[#7A4FFF] font-medium">•</span>
                  <span>Reveals the structural pattern behind your identity — not who you are after the fact, but the forces that shaped you.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#7A4FFF] font-medium">•</span>
                  <span>Generated in real time from your birth data — light, gravity, tidal fields, celestial mechanics. No templates.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#7A4FFF] font-medium">•</span>
                  <span>A shareable artifact card, three signature images, and a full narrative report — yours to keep.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Get your Light Signature — form + CTA (or waitlist-only when NEXT_PUBLIC_WAITLIST_ONLY=1) */}
      <section id="form" className={`${sectionClass} border-[var(--beauty-line,#e8e4e8)]/30`}>
        <div className="max-w-2xl mx-auto space-y-8 text-center">
          <h2 className={headingClass} style={{ letterSpacing: "0.02em" }}>
            {WAITLIST_ONLY ? "Join Early Access" : "Get your Light Signature"}
          </h2>
          {WAITLIST_ONLY && (
            <p className={`${textClass} text-center`}>
              Be among the first to discover your Light Identity.
            </p>
          )}

          {/* Early Access waitlist — always shown, prominent when WAITLIST_ONLY */}
          <div className={`max-w-md mx-auto ${WAITLIST_ONLY ? "space-y-4" : "space-y-3"}`}>
            {WAITLIST_ONLY && (
              <p className={`${textClass} text-center`}>
                IGNISPECTRUM unlocking soon. Join the waitlist to be first.
              </p>
            )}
            <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
              <input
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={waitlistSuccess || waitlistLoading}
                required
                className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-[var(--beauty-line,#e8e4e8)] bg-white/90 text-[var(--beauty-text,#0d0b10)] placeholder:text-[var(--beauty-text,#0d0b10)]/50 focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/40 disabled:opacity-70"
                aria-label="Email for early access"
              />
              <button
                type="submit"
                disabled={waitlistLoading || waitlistSuccess || !waitlistEmail.trim()}
                className="px-6 py-3 bg-[#7A4FFF] text-white text-base font-semibold rounded-xl hover:bg-[#8b5fff] transition-colors disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {waitlistLoading ? "Joining…" : waitlistSuccess ? "You're on the list" : "Join Early Access"}
              </button>
            </form>
            {waitlistSuccess && (
              <p className="text-sm text-green-700 font-medium">You're on the list.</p>
            )}
            {waitlistError && (
              <p className="text-sm text-red-600">{waitlistError}</p>
            )}
          </div>

          {/* Form + Buy CTA — hidden when WAITLIST_ONLY */}
          {!WAITLIST_ONLY && (
            <>
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
              {apiDisabled && (
                <p className="text-amber-700 text-sm bg-amber-50 px-4 py-2 rounded-lg">Temporarily unavailable for maintenance. Please try again later.</p>
              )}
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={handleCtaPrimary}
                    disabled={apiDisabled || !formValid || ctaCheckoutLoading || generateLoading}
                    className="px-8 py-4 bg-[#7A4FFF] text-white text-base font-semibold rounded-xl hover:bg-[#8b5fff] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {apiDisabled
                      ? "Unavailable"
                      : ctaCheckoutLoading
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
                    See all 12 archetypes
                  </a>
                </div>
                {!formValid && (
                  <p className="text-sm beauty-text-muted">Complete the form to continue.</p>
                )}
                <button
                  type="button"
                  onClick={handleAlreadyPurchased}
                  disabled={apiDisabled}
                  className="text-sm beauty-text-muted hover:text-[#7A4FFF] transition-colors underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Already purchased? Enter your details →
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 12-regime static grid — no links, no click handlers */}
      <LandingPreviews
        variant="beauty"
        staticGrid={true}
        highlightArchetype="Ignispectrum"
        manifests={exemplarManifests}
      />

      {/* Unlock teaser — hidden when WAITLIST_ONLY */}
      {!WAITLIST_ONLY && (
        <section className={sectionClass}>
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <p className={headingClass} style={{ letterSpacing: "0.02em" }}>
              Unlock your Light Identity
            </p>
            <p className={textClass}>
              $39.99 pre-purchase unlock: generate your full Light Signature (card, images, narrative). One-time. Agent WHOIS for a report you already have is purchased separately from that report&apos;s view — API access for that report only, not another bundle.
            </p>
            <a
              href="#form"
              className="inline-block px-8 py-4 bg-[#7A4FFF] text-white text-base font-semibold rounded-xl hover:bg-[#8b5fff] transition-colors"
            >
              Get your report
            </a>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={sectionClass}>
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
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
          <p className={`text-xs ${mutedClass} font-light text-center`}>
            (L)igs — Helping Humans Integrate Since 2026
          </p>
        </div>
      </footer>
        </main>
      </div>
    </div>
  );
}
