"use client";

import { useState } from "react";
import { getArchetypePreviewConfig } from "@/lib/archetype-preview-config";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3ELight Signature%3C/text%3E%3C/svg%3E";

const LABELS = ["Vector Zero", "Light Signature", "Final Beauty Field"];

export default function PreviewCarousel({
  imageUrls = [],
  labels = LABELS,
  subjectName,
  hideEmptySlots = false,
  /** When true and current slide is Light Signature, layers ignis-glyph-overlay above the image. (Backward compat: treat as glyphOverlayArchetype="Ignispectrum") */
  glyphOverlayForIgnis = false,
  /** When set, use getArchetypePreviewConfig to get glyph and show on Light Signature slide. */
  glyphOverlayArchetype = undefined,
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const urls = Array.isArray(imageUrls)
    ? imageUrls
    : [PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE];
  const safeUrls = urls.slice(0, 3).filter((u) => u && typeof u === "string");
  if (!hideEmptySlots) {
    while (safeUrls.length < 3) safeUrls.push(PLACEHOLDER_IMAGE);
  }
  if (safeUrls.length === 0) safeUrls.push(PLACEHOLDER_IMAGE);

  const next = () => setCurrentSlide((s) => (s + 1) % safeUrls.length);
  const prev = () => setCurrentSlide((s) => (s - 1 + safeUrls.length) % safeUrls.length);

  const effectiveGlyphArchetype = glyphOverlayArchetype ?? (glyphOverlayForIgnis ? "Ignispectrum" : null);
  const glyphConfig = effectiveGlyphArchetype ? getArchetypePreviewConfig(effectiveGlyphArchetype) : null;
  const showGlyphOnLightSignature = glyphConfig?.hasGlyph && (labels[currentSlide] ?? LABELS[currentSlide]) === "Light Signature";

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

  return (
    <div className="relative">
      <div
        className="flex items-center justify-center gap-2 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={prev}
          className="px-2.5 py-1.5 border border-[#2a2a2e] text-[#9a9aa0] hover:border-[#7A4FFF]/40 hover:text-[#c8c8cc] transition-colors shrink-0 rounded text-[14px] font-mono"
          aria-label="Previous image"
        >
          ‹
        </button>
        <div className="relative flex-1 min-w-0 aspect-[4/3] overflow-hidden bg-[#0d0d0f] border border-[#2a2a2e] rounded-lg">
          <img
            src={safeUrls[currentSlide] ?? PLACEHOLDER_IMAGE}
            alt={subjectName ? `${labels[currentSlide]} for ${subjectName}` : labels[currentSlide]}
            className="w-full h-full object-cover"
          />
          {showGlyphOnLightSignature && (
            <img
              src={glyphConfig.glyphPath}
              alt=""
              aria-hidden
              className="archetype-glyph-overlay"
            />
          )}
        </div>
        <button
          type="button"
          onClick={next}
          className="px-2.5 py-1.5 border border-[#2a2a2e] text-[#9a9aa0] hover:border-[#7A4FFF]/40 hover:text-[#c8c8cc] transition-colors shrink-0 rounded text-[14px] font-mono"
          aria-label="Next image"
        >
          ›
        </button>
      </div>
      <p className="text-center text-[10px] font-mono uppercase tracking-wider text-[#9a9aa0] mt-2">
        {labels[currentSlide] ?? `Artifact ${currentSlide + 1}`}
      </p>
      <div className="flex justify-center gap-1.5 mt-2">
        {safeUrls.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentSlide(i)}
            className={`w-1.5 h-1.5 rounded-sm transition-colors ${i === currentSlide ? "bg-[#7A4FFF]" : "bg-[#2a2a2e]"}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
