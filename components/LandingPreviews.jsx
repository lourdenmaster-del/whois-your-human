"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchBlobPreviews } from "@/lib/api-client";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";
import PreviewCardModal from "./PreviewCardModal";

const isPlaceholder = (url) =>
  !url || (typeof url === "string" && url.startsWith("data:image/svg+xml"));

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
function ExemplarSlot({ archetype, imageUrl, descriptor, cardBorder, cardBg, snippetClass, onSelect }) {
  const [imgError, setImgError] = useState(false);
  const showPlaceholder = !imageUrl || imgError;

  const handleError = useCallback(() => setImgError(true), []);

  return (
    <div
      className={`w-full text-left block border ${cardBorder} ${cardBg} transition-colors duration-300 group`}
      style={{ borderRadius: 0 }}
    >
      <button type="button" onClick={() => onSelect({ reportId: `exemplar-${archetype}`, subjectName: archetype, emotionalSnippet: descriptor.tagline, dominantArchetype: archetype, imageUrls: imageUrl ? [imageUrl] : [], marketingCardUrl: imageUrl })} className="w-full text-left block">
        <div className="aspect-[4/3] overflow-hidden bg-[#0A0F1C] min-h-[120px]">
          {showPlaceholder ? (
            <NeutralPlaceholder className="w-full h-full" />
          ) : (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={handleError}
            />
          )}
        </div>
        <div className="p-5">
          <p className="text-xs uppercase tracking-widest text-[#7A4FFF] mb-2 font-medium">
            {archetype}
          </p>
          <p className={`text-sm ${snippetClass} font-light italic line-clamp-3 leading-relaxed`}>
            &ldquo;{descriptor.tagline}&rdquo;
          </p>
          {descriptor.hitPoints?.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs opacity-80">
              {descriptor.hitPoints.slice(0, 2).map((hp, i) => (
                <li key={i} className="line-clamp-1">· {hp}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-[#7A4FFF]/80 font-medium">
            View report →
          </p>
        </div>
      </button>
      <div className="px-5 pb-5">
        <Link
          href={`/beauty/view?reportId=exemplar-${encodeURIComponent(archetype)}`}
          className="block w-full py-2 text-center text-xs font-semibold uppercase tracking-wider border border-[#7A4FFF]/50 text-[#7A4FFF] hover:bg-[#7A4FFF]/10 transition-colors"
        >
          View / Open Artifact
        </Link>
      </div>
    </div>
  );
}

export default function LandingPreviews({
  maxCards = 3,
  maxPreviews,
  useBlob = true,
  exemplarVersion = "v1",
  clearSelectionTrigger = 0,
  variant = "dark", // "dark" | "beauty"
  initialCards, // when provided, skip fetch (used when parent lifts preview fetch)
}) {
  const isBeauty = variant === "beauty";
  const sectionBorder = isBeauty ? "border-[var(--beauty-line,#e8e4e8)]" : "border-[#0A0F1C]";
  const headingClass = isBeauty ? "beauty-heading text-[var(--beauty-text,#0d0b10)]" : "text-[#F5F5F5]";
  const mutedClass = isBeauty ? "beauty-text-muted" : "text-[#F5F5F5]/60";
  const cardBorder = isBeauty ? "border-[var(--beauty-line,#e8e4e8)] hover:border-[#7A4FFF]/50" : "border-[#0A0F1C] hover:border-[#7A4FFF]/50";
  const cardBg = isBeauty ? "bg-white/50" : "bg-[#0A0F1C]/50";
  const snippetClass = isBeauty ? "text-[var(--beauty-text,#0d0b10)]" : "text-[#F5F5F5]/90";
  const router = useRouter();
  const [previewCards, setPreviewCards] = useState(initialCards ?? []);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedViewId, setSelectedViewId] = useState("");
  const [loading, setLoading] = useState(!initialCards);

  const limit = maxCards ?? maxPreviews ?? 3;

  // Maps archetype -> manifest (from GET /api/exemplars)
  const [manifestsByArchetype, setManifestsByArchetype] = useState({});

  useEffect(() => {
    setSelectedCard(null);
    setSelectedViewId("");
  }, [clearSelectionTrigger]);

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

  useEffect(() => {
    if (initialCards != null) {
      setPreviewCards(Array.isArray(initialCards) ? initialCards : []);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function loadPreviews() {
      try {
        setLoading(true);
        const data = await fetchBlobPreviews({ maxCards: limit, useBlob });
        if (cancelled) return;
        const list = data.previewCards || [];
        setPreviewCards(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load preview cards:", err);
          setPreviewCards([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPreviews();
    return () => { cancelled = true; };
  }, [limit, useBlob, initialCards]);

  const renderCardGrid = (cardsToRender) => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cardsToRender.map((card) => {
        const imageUrls = card.imageUrls ?? card.images ?? [];
        const thumbUrl =
          card.marketingCardUrl ||
          imageUrls.find((u) => !isPlaceholder(u)) ||
          imageUrls[0];
        return (
          <div
            key={card.reportId}
            className={`w-full text-left block border ${cardBorder} ${cardBg} transition-colors duration-300 group`}
            style={{ borderRadius: 0 }}
          >
            <button
              type="button"
              onClick={() => setSelectedCard(card)}
              className="w-full text-left block"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#0A0F1C]">
                <img
                  src={thumbUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'/%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3C/svg%3E"}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <p className="text-xs uppercase tracking-widest text-[#7A4FFF] mb-2 font-medium">
                  {card.subjectName ?? "Anonymous"}
                </p>
                <p className={`text-sm ${snippetClass} font-light italic line-clamp-3 leading-relaxed`}>
                  &ldquo;{card.emotionalSnippet}&rdquo;
                </p>
                {card.summaryText && (
                  <p className={`mt-2 text-xs ${mutedClass} font-normal line-clamp-2`}>
                    {card.summaryText}
                  </p>
                )}
                <p className="mt-3 text-xs text-[#7A4FFF]/80 font-medium">
                  View report →
                </p>
              </div>
            </button>
            <div className="px-5 pb-5">
              <Link
                href={`/beauty/view?reportId=${encodeURIComponent(card.reportId)}`}
                className="block w-full py-2 text-center text-xs font-semibold uppercase tracking-wider border border-[#7A4FFF]/50 text-[#7A4FFF] hover:bg-[#7A4FFF]/10 transition-colors"
              >
                View / Open Artifact
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );

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
              const imageUrl = manifest?.urls?.exemplarCard ?? `/exemplars/${archetype.toLowerCase()}.png`;
              const descriptor = manifest?.marketingDescriptor ?? getMarketingDescriptor(archetype);
              return (
                <ExemplarSlot
                  key={archetype}
                  archetype={archetype}
                  imageUrl={imageUrl}
                  descriptor={descriptor}
                  cardBorder={cardBorder}
                  cardBg={cardBg}
                  snippetClass={snippetClass}
                  onSelect={setSelectedCard}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Previous Light Identity Reports — only when blob previews exist */}
      {previewCards.length > 0 && (
        <section
          className={`relative px-6 sm:px-16 lg:px-32 py-24 border-t ${sectionBorder} bg-transparent`}
          style={{ zIndex: 10 }}
        >
          <div className="max-w-4xl mx-auto">
            <h2 className={`text-2xl sm:text-3xl font-semibold tracking-wide mb-4 text-center ${headingClass}`} style={{ letterSpacing: "0.02em" }}>
              Previous Light Identity Reports
            </h2>
            <p className={`${mutedClass} text-center mb-12 font-light max-w-xl mx-auto`}>
              Curated excerpts from Light Identity Reports — emotional resonance and imagery from past analyses.
            </p>
            {isBeauty && (
              <div className="flex flex-wrap items-center gap-3 mb-8 justify-center">
                <select
                  value={selectedViewId}
                  onChange={(e) => setSelectedViewId(e.target.value)}
                  className="p-2.5 rounded-xl border border-[rgba(122,79,255,0.25)] bg-white/90 text-[var(--beauty-text,#0d0b10)] focus:outline-none focus:ring-2 focus:ring-[#7A4FFF]/40 text-sm min-w-[200px]"
                  aria-label="Choose report to view"
                >
                  <option value="">— Choose a report —</option>
                  {previewCards.map((c) => (
                    <option key={c.reportId} value={c.reportId}>
                      {c.subjectName ?? "Report"} · {c.reportId}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => selectedViewId && router.push(`/beauty/view?reportId=${encodeURIComponent(selectedViewId)}`)}
                  disabled={!selectedViewId}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#7A4FFF] text-white hover:bg-[#8b5fff] disabled:hover:opacity-50"
                >
                  View Artifact
                </button>
              </div>
            )}
            {renderCardGrid(previewCards)}
          </div>
        </section>
      )}

      {selectedCard && (
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
