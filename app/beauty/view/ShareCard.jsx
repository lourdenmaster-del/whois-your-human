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
      className={`share-card registry-share-panel relative w-full mx-auto overflow-hidden rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] ${hasMarketingCard ? "max-w-md" : "max-w-sm"}`}
    >
      {/* (L) registry mark */}
      <div
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded text-[9px] font-mono text-[#9a9aa0] border border-[#2a2a2e] bg-[#0a0a0b]/80"
        aria-hidden
      >
        (L)
      </div>

      {/* Primary image */}
      <div className={`overflow-hidden bg-[#0a0a0b] border-b border-[#2a2a2e] ${hasMarketingCard ? "aspect-square max-w-sm mx-auto" : "aspect-[4/3]"}`}>
        <img
          src={primaryImage}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <h2 className="text-[13px] font-medium text-[#e8e8ec] tracking-tight mb-0.5 font-mono">
          {descriptor.archetypeLabel}
        </h2>
        <p className="text-[11px] text-[#9a9aa0] mb-2">{descriptor.tagline}</p>
        {hitPoints.length > 0 && (
          <ul className="space-y-0.5 text-[12px] text-[#c8c8cc]">
            {hitPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#7A4FFF]/80 shrink-0">→</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions — registry controls */}
      <div className="px-4 pb-4 flex flex-col sm:flex-row gap-2 flex-wrap">
        <button
          type="button"
          onClick={onCopyLink}
          disabled={!shareUrl}
          className="flex-1 min-w-[120px] py-2 rounded border border-[#2a2a2e] text-[#c8c8cc] font-mono text-[11px] hover:border-[#7A4FFF]/40 hover:text-[#e8e8ec] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[#2a2a2e] disabled:hover:text-[#c8c8cc]"
        >
          {copied ? "Copied" : "Copy record link"}
        </button>
        <button
          type="button"
          onClick={handleDownloadPrimary}
          className="flex-1 min-w-[120px] py-2 rounded border border-[#2a2a2e] text-[#c8c8cc] font-mono text-[11px] hover:border-[#7A4FFF]/40 hover:text-[#e8e8ec] transition-colors"
        >
          {hasMarketingCard ? "Download artifact" : "Download image"}
        </button>
        {hasMarketingCard && (
          <button
            type="button"
            onClick={handleDownloadSignature}
            className="flex-1 min-w-[120px] py-2 rounded border border-[#2a2a2e] text-[#c8c8cc] font-mono text-[11px] hover:border-[#7A4FFF]/40 hover:text-[#e8e8ec] transition-colors"
          >
            Download signature
          </button>
        )}
      </div>
    </div>
  );
}

export { extractArchetypeFromProfile, pickSignatureImage };
