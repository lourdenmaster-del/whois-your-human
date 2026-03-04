"use client";

import { useState, useEffect } from "react";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import type { MarketingDescriptor, MarketingAssets } from "@/lib/marketing/types";

/** Resolves asset to a display URL (for img src). */
function assetToUrl(asset: { url?: string; b64?: string } | undefined): string | null {
  if (!asset) return null;
  if (asset.url) return asset.url;
  if (asset.b64) return `data:image/png;base64,${asset.b64}`;
  return null;
}

export interface MarketingHeaderProps {
  /** When set, fetches visuals and derives descriptor. Takes precedence for self-contained mode. */
  primaryArchetype?: string;
  /** Descriptor (used when provided; else derived from primaryArchetype). */
  descriptor?: MarketingDescriptor;
  /** Assets (used when provided; else fetched from /api/marketing/visuals when primaryArchetype). When defined (even {} or null), skips fetch. */
  assets?: MarketingAssets | null;
  /** Slight clarity/energy boost (0–1). Default 0.2 for more declarative marketing surface. */
  contrastDelta?: number;
  /** Show CTA button. */
  showCTA?: boolean;
  /** CTA click handler. When provided with showCTA, button is enabled. */
  onCTA?: () => void;
  /** When false, renders minimal (no background, no logo). For dev toggle. */
  showMarketingLayer?: boolean;
  /** Warnings from visuals API; shown only in dev when present. */
  warnings?: string[];
  className?: string;
}

export default function MarketingHeader({
  primaryArchetype,
  descriptor: descriptorProp,
  assets: assetsProp,
  contrastDelta = 0.2,
  showCTA = false,
  onCTA,
  showMarketingLayer = true,
  warnings,
  className = "",
}: MarketingHeaderProps) {
  const [assets, setAssets] = useState<MarketingAssets | null>(assetsProp ?? null);
  const [loadingVisuals, setLoadingVisuals] = useState(false);

  const descriptor: MarketingDescriptor =
    descriptorProp ??
    (primaryArchetype
      ? getMarketingDescriptor(primaryArchetype, { contrastDelta })
      : ({
          archetypeLabel: "—",
          tagline: "",
          hitPoints: [],
          ctaText: "Learn more",
          ctaStyle: "soft",
          contrastDelta: 0.2,
        } as MarketingDescriptor));

  useEffect(() => {
    if (assetsProp !== undefined) {
      queueMicrotask(() => setAssets(assetsProp ?? null));
      return;
    }
    if (!primaryArchetype || typeof window === "undefined") return;

    queueMicrotask(() => setLoadingVisuals(true));
    fetch("/api/marketing/visuals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary_archetype: primaryArchetype,
        contrastDelta: Math.max(0, Math.min(1, contrastDelta)),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const logo = data.logoMark ?? null;
        const bg = data.marketingBackground ?? null;
        setAssets({
          ...(logo && { logoMark: logo }),
          ...(bg && { marketingBackground: bg }),
        });
      })
      .catch(() => setAssets(null))
      .finally(() => setLoadingVisuals(false));
  }, [primaryArchetype, contrastDelta, assetsProp]);

  const bgUrl = showMarketingLayer ? assetToUrl(assets?.marketingBackground) : null;
  const logoUrl = showMarketingLayer ? assetToUrl(assets?.logoMark) : null;
  const isDev = typeof window !== "undefined" && window.location?.hostname === "localhost";

  const ctaClass =
    descriptor.ctaStyle === "direct"
      ? "font-semibold border-2 border-current"
      : descriptor.ctaStyle === "premium"
        ? "font-medium border border-gray-400 text-gray-800"
        : "font-normal border border-gray-300 text-gray-700";

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={
        bgUrl
          ? {
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: "var(--marketing-header-bg, #f8f6f4)" }
      }
    >
      <div
        className="relative px-6 py-8 text-black"
        style={{
          backgroundColor: bgUrl ? "rgba(255,255,255,0.85)" : "transparent",
        }}
      >
        <div className="max-w-2xl">
          {loadingVisuals && !assets?.logoMark && (
            <div className="h-12 w-24 mb-4 bg-gray-200 animate-pulse rounded" aria-hidden />
          )}
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              className="h-12 w-auto object-contain mb-4"
              aria-hidden
            />
          )}
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            {descriptor.archetypeLabel}
          </h2>
          <p className="text-gray-600 text-sm mb-4">{descriptor.tagline}</p>
          {descriptor.hitPoints.length > 0 && (
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
              {descriptor.hitPoints.slice(0, 5).map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          )}
          {descriptor.ctaText && (
            <button
              type="button"
              className={`px-4 py-2 rounded text-sm ${ctaClass}`}
              disabled={!showCTA || !onCTA}
              onClick={onCTA}
            >
              {descriptor.ctaText}
            </button>
          )}
        </div>
      </div>
      {isDev && warnings && warnings.length > 0 && (
        <div className="absolute bottom-0 right-0 text-xs text-amber-700 bg-amber-100/90 px-2 py-1 rounded-tl">
          {warnings.join("; ")}
        </div>
      )}
    </div>
  );
}
