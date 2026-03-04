"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";
import PreviewCardModal from "./PreviewCardModal";

/** Neutral placeholder block when no image available (avoids broken img). */
function NeutralPlaceholder({ className = "" }) {
  return (
    <div
      className={`flex items-center justify-center bg-[#1a1f2e] text-[#5a6378] text-sm font-light ${className}`}
      aria-hidden
    >
      <span>—</span>
    </div>
  );
}

/** Single exemplar slot with image error fallback (no broken images). */
function ExemplarSlot({ archetype, imageUrl, lightboxImages, descriptor, cardBorder, cardBg, snippetClass, onSelect, staticGrid, highlightArchetype }) {
  const [imgError, setImgError] = useState(false);
  const showPlaceholder = !imageUrl || imgError;
  const isHighlighted = highlightArchetype && archetype === highlightArchetype;
  const reduceOpacity = staticGrid && !isHighlighted;

  const handleError = useCallback(() => setImgError(true), []);

  const handleClick = useCallback(() => {
    if (staticGrid) return;
    const images = Array.isArray(lightboxImages) ? lightboxImages.filter(Boolean) : (imageUrl ? [imageUrl] : []);
    onSelect?.({
      reportId: `exemplar-${archetype}`,
      subjectName: archetype,
      emotionalSnippet: descriptor.tagline,
      dominantArchetype: archetype,
      imageUrls: images,
      marketingCardUrl: imageUrl,
    });
  }, [archetype, lightboxImages, imageUrl, descriptor.tagline, onSelect, staticGrid]);

  const showLockedBlur = staticGrid && !isHighlighted;

  const content = (
    <>
      <div className="aspect-[4/3] overflow-hidden bg-[#0A0F1C] min-h-[120px] relative">
        {showPlaceholder ? (
          <NeutralPlaceholder className="w-full h-full" />
        ) : (
          <>
            <img
              src={imageUrl}
              alt=""
              className="relative z-[1] w-full h-full object-cover"
              onError={handleError}
            />
            {archetype === "Ignispectrum" && (
              <img
                src="/glyphs/ignis.svg"
                alt=""
                aria-hidden
                className="ignis-glyph-overlay"
              />
            )}
          </>
        )}
        {showLockedBlur && !showPlaceholder && (
          <div
            className="absolute left-1/2 top-1/2 flex items-center justify-center locked-blur-overlay"
            style={{
              transform: "translate(-50%, -50%)",
              width: "72%",
              height: "44%",
              maxWidth: "95%",
              maxHeight: "95%",
              borderRadius: "9999px",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              background: "rgba(0,0,0,0.18)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            <span
              className="text-xs sm:text-sm font-medium tracking-widest uppercase"
              style={{
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "0.2em",
              }}
            >
              Unlocking
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-widest text-[#7A4FFF] mb-2 font-medium">
          {archetype}
        </p>
        <p className={`text-sm ${snippetClass} font-light italic line-clamp-3 leading-relaxed`}>
          &ldquo;{descriptor.tagline}&rdquo;
        </p>
        {descriptor.hitPoints?.length > 0 && !staticGrid && (
          <ul className="mt-2 space-y-1 text-xs opacity-80">
            {descriptor.hitPoints.slice(0, 2).map((hp, i) => (
              <li key={i} className="line-clamp-1">· {hp}</li>
            ))}
          </ul>
        )}
        {staticGrid ? (
          <p className="mt-3 text-xs text-[#7A4FFF]/70 font-medium">
            {isHighlighted ? "IGNISPECTRUM unlocking soon" : "Unlocking soon"}
          </p>
        ) : (
          <p className="mt-3 text-xs text-[#7A4FFF]/80 font-medium">
            View report →
          </p>
        )}
      </div>
      {!staticGrid && (
        <div className="px-5 pb-5">
          <Link
            href={`/beauty/view?reportId=exemplar-${encodeURIComponent(archetype)}`}
            className="block w-full py-2 text-center text-xs font-semibold uppercase tracking-wider border border-[#7A4FFF]/50 text-[#7A4FFF] hover:bg-[#7A4FFF]/10 transition-colors"
          >
            View / Open Artifact
          </Link>
        </div>
      )}
    </>
  );

  return (
    <div
      className={`w-full text-left block border ${cardBorder} ${cardBg} transition-colors duration-300 ${reduceOpacity ? "opacity-60" : ""}`}
      style={{ borderRadius: 0 }}
    >
      {staticGrid ? (
        <div className="w-full text-left block cursor-default pointer-events-none">
          {content}
        </div>
      ) : (
        <button type="button" onClick={handleClick} className="w-full text-left block">
          {content}
        </button>
      )}
    </div>
  );
}

export default function LandingPreviews({
  exemplarVersion = "v1",
  clearSelectionTrigger = 0,
  variant = "dark", // "dark" | "beauty"
  staticGrid = false, // conversion MVP: non-interactive grid, no links, non-highlight opacity 0.6, "Unlocking Soon"
  highlightArchetype = "Ignispectrum", // full opacity in static mode
}) {
  const isBeauty = variant === "beauty";
  const sectionBorder = isBeauty ? "border-[var(--beauty-line,#e8e4e8)]" : "border-[#0A0F1C]";
  const headingClass = isBeauty ? "beauty-heading text-[var(--beauty-text,#0d0b10)]" : "text-[#F5F5F5]";
  const mutedClass = isBeauty ? "beauty-text-muted" : "text-[#F5F5F5]/60";
  const cardBorder = isBeauty ? "border-[var(--beauty-line,#e8e4e8)] hover:border-[#7A4FFF]/50" : "border-[#0A0F1C] hover:border-[#7A4FFF]/50";
  const cardBg = isBeauty ? "bg-white/50" : "bg-[#0A0F1C]/50";
  const snippetClass = isBeauty ? "text-[var(--beauty-text,#0d0b10)]" : "text-[#F5F5F5]/90";
  const [selectedCard, setSelectedCard] = useState(null);
  // Static value to avoid hydration mismatch (server/client must match)
  const ignisCacheBust = useRef("v=ignis-glyph");

  // Maps archetype -> manifest (from GET /api/exemplars)
  const [manifestsByArchetype, setManifestsByArchetype] = useState({});

  useEffect(() => {
    if (!staticGrid) setSelectedCard(null);
  }, [clearSelectionTrigger, staticGrid]);

  useEffect(() => {
    let cancelled = false;
    async function loadExemplars() {
      try {
        const res = await fetch(`/api/exemplars?version=${encodeURIComponent(exemplarVersion)}`);
        if (cancelled) return;
        if (!res.ok) return;
        const data = await res.json();
        const list = data.manifests ?? [];
        const map = {};
        for (const m of list) {
          const a = m.archetype;
          if (a) map[a] = m;
        }
        if (!cancelled) setManifestsByArchetype(map);
      } catch {
        // leave empty map; slots use getMarketingDescriptor + fallback images
      }
    }
    loadExemplars();
    return () => { cancelled = true; };
  }, [exemplarVersion]);

  return (
    <>
      {/* Examples — always shown */}
      <section
        id="examples"
        className={`relative px-6 sm:px-16 lg:px-32 py-24 border-t ${sectionBorder} bg-transparent`}
        style={{ zIndex: 10 }}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-2xl sm:text-3xl font-semibold tracking-wide mb-4 text-center ${headingClass}`} style={{ letterSpacing: "0.02em" }}>
            Examples
          </h2>
          <p className={`${mutedClass} text-center mb-12 font-light max-w-xl mx-auto`}>
            Sample Light Identity artifact cards — each archetype reveals a distinct aesthetic signature.
          </p>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {LIGS_ARCHETYPES.map((archetype) => {
              const manifest = manifestsByArchetype[archetype];
              const urls = manifest?.urls ?? {};
              const exemplarCard = urls.exemplarCard ?? urls.exemplar_card;
              const marketingBackground = urls.marketingBackground ?? urls.marketing_background;
              const shareCard = urls.shareCard ?? urls.share_card;
              const lightboxImages = [exemplarCard, marketingBackground, shareCard].filter(Boolean);
              let imageUrl = exemplarCard ?? `/exemplars/${archetype.toLowerCase()}.png`;
              if (archetype === "Ignispectrum" && imageUrl && !imageUrl.includes("data:")) {
                imageUrl = `${imageUrl}?${ignisCacheBust.current}`;
              }
              const descriptor = manifest?.marketingDescriptor ?? getMarketingDescriptor(archetype);
              return (
                <ExemplarSlot
                  key={archetype}
                  archetype={archetype}
                  imageUrl={imageUrl}
                  lightboxImages={lightboxImages}
                  descriptor={descriptor}
                  cardBorder={cardBorder}
                  cardBg={cardBg}
                  snippetClass={snippetClass}
                  onSelect={staticGrid ? undefined : setSelectedCard}
                  staticGrid={staticGrid}
                  highlightArchetype={staticGrid ? highlightArchetype : undefined}
                />
              );
            })}
          </div>
        </div>
      </section>

      {!staticGrid && selectedCard && (
        <PreviewCardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          maxImages={3}
          variant={variant}
        />
      )}
    </>
  );
}
