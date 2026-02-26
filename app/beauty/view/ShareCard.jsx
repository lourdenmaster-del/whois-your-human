"use client";

import React, { useCallback } from "react";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import { LIGS_ARCHETYPES, FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3ELight Signature%3C/text%3E%3C/svg%3E";

/** Extract archetype from profile when dominantArchetype is not set (backward compat). */
function extractArchetypeFromProfile(profile) {
  const text = [
    profile.archetype?.raw_signal ?? "",
    profile.archetype?.custodian ?? "",
    profile.archetype?.oracle ?? "",
    profile.fullReport ?? "",
  ].join(" ");
  for (const arch of LIGS_ARCHETYPES) {
    if (text.includes(arch)) return arch;
  }
  return null;
}

/** Pick best signature image: prefer Light Signature (index 1), else first available. */
function pickSignatureImage(imageUrls = []) {
  const urls = Array.isArray(imageUrls) ? imageUrls : [];
  if (urls[1]) return urls[1];
  if (urls[0]) return urls[0];
  if (urls[2]) return urls[2];
  return PLACEHOLDER_SVG;
}

/** Primary shareable: share card when present, else marketing card, else signature image. */
function pickPrimaryImage(profile) {
  if (profile?.shareCardUrl) return profile.shareCardUrl;
  if (profile?.marketingCardUrl) return profile.marketingCardUrl;
  return pickSignatureImage(profile?.imageUrls);
}

export default function ShareCard({
  profile,
  shareUrl = "",
  onCopyLink,
  copied = false,
}) {
  const archetype =
    profile?.dominantArchetype ?? extractArchetypeFromProfile(profile ?? {}) ?? FALLBACK_PRIMARY_ARCHETYPE;
  const descriptor = getMarketingDescriptor(archetype);
  const hitPoints = (descriptor.hitPoints ?? []).slice(0, 3);
  const signatureImage = pickSignatureImage(profile?.imageUrls);
  const primaryImage = pickPrimaryImage(profile);
  const hasMarketingCard = !!profile?.marketingCardUrl || !!profile?.shareCardUrl;

  const downloadImage = useCallback(async (url, filename) => {
    try {
      if (!url || url === PLACEHOLDER_SVG) return;
      if (url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
      } else {
        const res = await fetch(url, { mode: "cors" });
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(objUrl);
      }
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }, []);

  const handleDownloadPrimary = useCallback(() => {
    downloadImage(primaryImage, `light-identity-${profile?.reportId ?? "share"}.png`);
  }, [primaryImage, profile?.reportId, downloadImage]);

  const handleDownloadSignature = useCallback(() => {
    downloadImage(signatureImage, `light-signature-${profile?.reportId ?? "share"}.png`);
  }, [signatureImage, profile?.reportId, downloadImage]);

  return (
    <div
      className={`share-card relative w-full mx-auto overflow-hidden rounded-2xl shadow-xl ${hasMarketingCard ? "max-w-lg" : "max-w-sm"}`}
      style={{
        backgroundColor: "var(--beauty-cream, #fdf8f5)",
        border: "1px solid rgba(122, 79, 255, 0.15)",
      }}
    >
      {/* (L) brand mark */}
      <div
        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold text-[#7A4FFF]/60"
        style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
        aria-hidden
      >
        (L)
      </div>

      {/* Primary image: marketing card (bigger) when present, else signature */}
      <div className={`overflow-hidden bg-[#0A0F1C]/5 ${hasMarketingCard ? "aspect-square max-w-md mx-auto" : "aspect-[4/3]"}`}>
        <img
          src={primaryImage}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        <h2 className="text-lg font-semibold beauty-text-inverse tracking-tight mb-0.5">
          {descriptor.archetypeLabel}
        </h2>
        <p className="text-sm beauty-text-muted mb-3">{descriptor.tagline}</p>
        {hitPoints.length > 0 && (
          <ul className="space-y-1 text-sm beauty-text-inverse font-medium">
            {hitPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#7A4FFF] mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex flex-col sm:flex-row gap-2 flex-wrap">
        <button
          type="button"
          onClick={onCopyLink}
          disabled={!shareUrl}
          className="flex-1 min-w-[140px] beauty-body text-sm font-semibold py-2.5 rounded-xl border border-[#7A4FFF]/40 text-[#7A4FFF] hover:bg-[#7A4FFF]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? "Copied!" : "Copy share link"}
        </button>
        <button
          type="button"
          onClick={handleDownloadPrimary}
          className="flex-1 min-w-[140px] beauty-body text-sm font-semibold py-2.5 rounded-xl border border-[#7A4FFF]/40 text-[#7A4FFF] hover:bg-[#7A4FFF]/10 transition-colors"
        >
          {hasMarketingCard ? "Download card" : "Download image"}
        </button>
        {hasMarketingCard && (
          <button
            type="button"
            onClick={handleDownloadSignature}
            className="flex-1 min-w-[140px] beauty-body text-sm font-semibold py-2.5 rounded-xl border border-[#7A4FFF]/40 text-[#7A4FFF] hover:bg-[#7A4FFF]/10 transition-colors"
          >
            Download signature
          </button>
        )}
      </div>
    </div>
  );
}

export { extractArchetypeFromProfile, pickSignatureImage };
