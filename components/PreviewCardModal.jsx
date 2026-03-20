"use client";

import { useState, useEffect } from "react";
import { setBeautyUnlocked } from "@/lib/landing-storage";
import { FAKE_PAY } from "@/lib/dry-run-config";
import { useApiStatus } from "@/hooks/useApiStatus";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em' font-family='system-ui'%3EWHOIS%20record%3C/text%3E%3C/svg%3E";

const CAROUSEL_LABELS = ["Vector Zero", "WHOIS record", "Final Beauty"];

function Carousel({ imageUrls, labels = CAROUSEL_LABELS, variant = "dark" }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const urls = Array.isArray(imageUrls)
    ? imageUrls
    : [PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE];
  const safeUrls = urls.slice(0, 3);
  while (safeUrls.length < 3) safeUrls.push(PLACEHOLDER_IMAGE);

  const next = () => setCurrentSlide((s) => (s + 1) % safeUrls.length);
  const prev = () => setCurrentSlide((s) => (s - 1 + safeUrls.length) % safeUrls.length);

  const handleTouchStart = (e) =>
    setTouchStart(e.touches[0] ? e.touches[0].clientX : null);
  const handleTouchEnd = (e) => {
    if (touchStart == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStart;
    const delta = touchStart - endX;
    if (delta > 50) next();
    else if (delta < -50) prev();
    setTouchStart(null);
  };

  const labelClass = variant === "beauty" ? "beauty-text-muted" : "text-[#F5F5F5]/60";
  const dotClass = variant === "beauty" ? "bg-[var(--beauty-text-muted)]/30" : "bg-[#F5F5F5]/30";

  return (
    <div className="relative">
      <div
        className="flex items-center justify-center gap-2 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }}
          className="px-3 py-2 border border-[#7A4FFF]/50 text-[#7A4FFF] hover:bg-[#7A4FFF]/10 transition-colors shrink-0 rounded-lg"
          aria-label="Previous image"
        >
          ‹
        </button>
        <div className="flex-1 min-w-0 aspect-[4/3] overflow-hidden bg-[#0A0F1C]/10 rounded-2xl">
          <img
            src={safeUrls[currentSlide] ?? PLACEHOLDER_IMAGE}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }}
          className="px-3 py-2 border border-[#7A4FFF]/50 text-[#7A4FFF] hover:bg-[#7A4FFF]/10 transition-colors shrink-0 rounded-lg"
          aria-label="Next image"
        >
          ›
        </button>
      </div>
      <p className={`text-center text-xs mt-2 font-light ${labelClass}`}>
        {labels[currentSlide] ?? `Slide ${currentSlide + 1}`}
      </p>
      <div className="flex justify-center gap-1.5 mt-1">
        {safeUrls.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentSlide(i); }}
            className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? "bg-[#7A4FFF]" : dotClass}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function PreviewCardModal({ card, onClose, maxImages = 3, onProceed, variant = "dark" }) {
  const { disabled: apiDisabled } = useApiStatus();
  const [checkoutError, setCheckoutError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const imageUrls = (card?.imageUrls ?? card?.images ?? []).filter(Boolean).slice(0, maxImages);

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && card) {
      const urls = (card?.imageUrls ?? card?.images ?? []).filter(Boolean);
      console.log("Lightbox images", card.subjectName ?? card.dominantArchetype ?? "unknown", urls);
    }
  }, [card]);
  const isBeauty = variant === "beauty";

  const handleProceed = async () => {
    if (!card || apiDisabled) return;
    if (card.reportId?.startsWith?.("preview-")) {
      window.location.href = isBeauty ? "#form" : "#section-5";
      return;
    }
    if (onProceed) {
      return onProceed();
    }
    if (FAKE_PAY) {
      console.log("FAKE PAY MODE – no charge made");
      setBeautyUnlocked();
      window.location.href = "/beauty/start";
      return;
    }
    setCheckoutError(null);
    setRedirecting(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: card.reportId }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 404 || json?.code === "BEAUTY_PROFILE_NOT_FOUND") {
          setCheckoutError("This report doesn't have a Beauty Profile yet. Generate one via /beauty.");
        } else {
          setCheckoutError(json?.error ?? "Checkout unavailable. Try again later.");
        }
        setRedirecting(false);
        return;
      }
      const url = json?.data?.url ?? json?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
      } else {
        setCheckoutError("No checkout URL returned.");
      }
    } catch (err) {
      setCheckoutError("Could not start checkout. Please try again.");
    } finally {
      setRedirecting(false);
    }
  };

  const modalBg = isBeauty ? "bg-[var(--beauty-cream,#fdf8f5)] border-[var(--beauty-line,#e8e4e8)]" : "bg-[#0A0F1C] border-[#7A4FFF]/30";
  const titleClass = isBeauty ? "text-[var(--beauty-text,#0d0b10)]" : "text-[#F5F5F5]";
  const snippetClass = isBeauty ? "text-[var(--beauty-text,#0d0b10)]/90" : "text-[#F5F5F5]/90";
  const mutedClass = isBeauty ? "text-[var(--beauty-text-muted)]/70" : "text-[#F5F5F5]/50";
  const closeClass = isBeauty ? "text-[var(--beauty-text,#0d0b10)]/60 hover:text-[var(--beauty-text,#0d0b10)]" : "text-[#F5F5F5]/60 hover:text-[#F5F5F5]";
  const btnSecondaryClass = isBeauty ? "border-[var(--beauty-line,#e8e4e8)] text-[var(--beauty-text,#0d0b10)]/80 hover:bg-[var(--beauty-line,#e8e4e8)]/20" : "border-[#F5F5F5]/30 text-[#F5F5F5]/80 hover:bg-[#F5F5F5]/10";

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={onClose}
    >
      <div
        className={`relative ${modalBg} border max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 ${closeClass} p-1 z-10`}
          aria-label="Close"
        >
          ✕
        </button>
        <h2 id="preview-modal-title" className={`text-xl font-semibold ${titleClass} mb-4`}>
          {card?.subjectName ?? "Anonymous"}
        </h2>
        <div className="mb-6">
          <Carousel imageUrls={imageUrls} variant={variant} />
        </div>
        <p className={`${snippetClass} font-light italic mb-6`}>
          &ldquo;{card?.emotionalSnippet}&rdquo;
        </p>
        {checkoutError && (
          <p className="text-red-500 text-sm font-normal mb-2" role="alert">
            {checkoutError}
          </p>
        )}
        {apiDisabled && (
          <p className="text-amber-600 text-sm font-normal mb-2" role="alert">
            Temporarily unavailable for maintenance.
          </p>
        )}
        <p className={`text-xs ${mutedClass} text-center mb-2`}>
          Stripe test mode — no real charges
        </p>
        <div className="flex flex-col gap-2 w-full">
          <div className="flex gap-3">
          <button
            type="button"
            onClick={handleProceed}
            disabled={apiDisabled || redirecting}
            className="flex-1 px-6 py-3 bg-[#7A4FFF] text-white text-sm font-semibold hover:bg-[#8b5fff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
          >
            {apiDisabled ? "Unavailable" : redirecting ? "Redirecting…" : "Unlock WHOIS Agent Access"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-3 border text-sm font-medium transition-colors rounded-xl ${btnSecondaryClass}`}
          >
            Close
          </button>
          </div>
          <p className={`text-xs ${mutedClass} text-center`}>
            One-time · For this report only
          </p>
        </div>
      </div>
    </div>
  );
}
