"use client";

import { useState } from "react";
import ArchetypeNameOverlay from "./ArchetypeNameOverlay";
import ArtifactInfoPanel from "./ArtifactInfoPanel";

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3ELight Signature%3C/text%3E%3C/svg%3E";

/**
 * Build artifacts object from Beauty profile or LigsStudio run data.
 */
export function buildArtifactsFromProfile(profile) {
  if (!profile) return {};
  const v0 = profile.vector_zero;
  const baseline = v0?.beauty_baseline;
  const arch = profile.dominantArchetype ?? profile.ligs?.primary_archetype ?? profile.archetype?.raw_signal?.slice?.(0, 24);
  return {
    archetype: arch ?? "—",
    variationKey: profile.variationKey ?? "—",
    dateTime: profile.timings?.createdAt ?? "—",
    location: profile.birthLocation ?? profile.placeName ?? "—",
    schemaVersion: profile.schemaVersion ?? "—",
    engineVersion: profile.engineVersion ?? "—",
    solarAzimuth: (() => {
      const sun = profile.birthContext?.sun;
      if (!sun) return "—";
      const deg = sun.sunAzimuthDeg ?? sun.azimuthDeg;
      return deg != null ? `${deg}°` : "—";
    })(),
    lightSeasonSegment: profile.birthContext?.sun?.twilightPhase ?? "—",
    colorFamily: baseline?.color_family || "—",
    textureBias: baseline?.texture_bias || "—",
    reportId: profile.reportId ?? "—",
    subjectName: profile.subjectName ?? "—",
  };
}

/**
 * Build artifacts from LigsStudio variation run.
 */
export function buildArtifactsFromVariationRun(run) {
  if (!run) return {};
  return {
    archetype: run.primary_archetype ?? "—",
    variationKey: run.variationKey ?? "—",
    dateTime: "—",
    location: "—",
    solarAzimuth: "—",
    lightSeasonSegment: "—",
  };
}

/**
 * Main artifact container: hero image + center overlay + left info panel.
 * Works for single image and Compare Runs (use inside ArtifactCompare).
 */
export default function ArchetypeArtifactCard({
  imageUrl,
  archetype,
  artifacts = {},
  className = "",
  imageAlt = "Archetype artifact",
  overlayStyle = undefined,
  showDevFields = false,
  /** "square" for 1:1 composed cards (object-contain, no crop); default for 16:9 backgrounds (object-cover). */
  aspectRatio = "video",
}) {
  const src = imageUrl || PLACEHOLDER_SVG;
  const defaultScrim = overlayStyle === "highContrast" ? "light" : "dark";
  const [scrimVariant, setScrimVariant] = useState(defaultScrim);
  const isSquare = aspectRatio === "square";
  const aspectClass = isSquare ? "aspect-square" : "aspect-[4/3] sm:aspect-[3/4]";
  const objectClass = isSquare ? "object-contain" : "object-cover";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[var(--artifact-panel-border)] bg-[var(--beauty-cream)] ${className}`}
      style={{
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex flex-row">
        <ArtifactInfoPanel artifacts={artifacts} showDevFields={showDevFields} />
        <div className={`relative flex-1 min-w-0 ${aspectClass}`}>
          <img
            src={src}
            alt={imageAlt}
            className={`w-full h-full ${objectClass}`}
          />
          <ArchetypeNameOverlay archetype={archetype} scrimVariant={scrimVariant} />
          <button
            type="button"
            className="absolute top-2 right-2 z-10 px-2 py-1 text-[10px] uppercase tracking-wider rounded bg-black/20 text-white/90 hover:bg-black/30 border border-white/10"
            onClick={() => setScrimVariant((v) => (v === "dark" ? "light" : "dark"))}
            title="Toggle overlay scrim (dark/light) for readability"
          >
            {scrimVariant}
          </button>
        </div>
      </div>
    </div>
  );
}
