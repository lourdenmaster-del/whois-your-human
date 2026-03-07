"use client";

import { useState } from "react";
import ArchetypeNameOverlay from "./ArchetypeNameOverlay";
import ArtifactInfoPanel from "./ArtifactInfoPanel";
import { getSolarSeasonProfile, getSolarSeasonByIndex } from "@/src/ligs/astronomy/solarSeason";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import { getArchetypePreviewConfig } from "@/lib/archetype-preview-config";

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3ELight Signature%3C/text%3E%3C/svg%3E";

function formatSolarSeasonDisplay(sp) {
  if (!sp) return null;
  const entry = getSolarSeasonByIndex(sp.seasonIndex);
  if (!entry) return null;
  return `${entry.lonStartDeg}–${entry.lonEndDeg}° (center ${entry.lonCenterDeg}°)`;
}

function formatDeclination(deg) {
  if (deg == null || typeof deg !== "number") return null;
  const sign = deg >= 0 ? "+" : "";
  return `${sign}${deg.toFixed(2)}°`;
}

/**
 * Build artifacts object from Beauty profile or LigsStudio run data.
 * Solar season fields: prefer profile.solarSeasonProfile; fallback to solarProfile.sunLonDeg.
 * For exemplars: use profile.exemplarBackfill (no birth-context fields).
 */
export function buildArtifactsFromProfile(profile) {
  if (!profile) return {};
  const backfill = profile.exemplarBackfill;
  const isExemplar = profile.isExemplar && backfill;

  if (isExemplar) {
    const arch = profile.dominantArchetype ?? "—";
    return {
      archetype: arch,
      variationKey: backfill.variationKey ?? "—",
      dateTime: backfill.dateTime ?? "—",
      location: backfill.location ?? "—",
      solarAzimuth: backfill.solarAzimuth ?? "—",
      lightSeasonSegment: backfill.lightSeasonSegment ?? "—",
      solarSeason: backfill.solarSeason ?? "—",
      declination: backfill.declination ?? "—",
      anchor: backfill.anchor ?? "—",
      cosmicAnalogue: backfill.cosmicAnalogue ?? "—",
      colorFamily: backfill.colorFamily ?? "—",
      textureBias: backfill.textureBias ?? "—",
      subjectName: profile.subjectName ?? "—",
      isExemplar: true,
    };
  }

  const v0 = profile.vector_zero;
  const baseline = v0?.beauty_baseline;
  const arch = profile.dominantArchetype ?? profile.ligs?.primary_archetype ?? profile.archetype?.raw_signal?.slice?.(0, 24);

  let solarSeason = "—";
  let declination = "—";
  let polarity = "—";
  let anchor = "—";
  let sp = profile.solarSeasonProfile;
  if (!sp && profile.solarProfile?.sunLonDeg != null) {
    const lat = profile.birthContext?.lat ?? profile.latitude ?? 0;
    const date = profile.timings?.createdAt ? new Date(profile.timings.createdAt) : new Date();
    sp = getSolarSeasonProfile({ sunLonDeg: profile.solarProfile.sunLonDeg, latitudeDeg: lat, date });
  }
  if (sp) {
    const d = formatSolarSeasonDisplay(sp);
    solarSeason = d ?? "—";
    declination = formatDeclination(sp.solarDeclinationDeg) ?? "—";
    polarity = sp.seasonalPolarity ?? "—";
    const entry = getSolarSeasonByIndex(sp.seasonIndex);
    anchor = entry?.anchorType ?? "—";
  }

  const cosmicAnalogue = arch ? getCosmicAnalogue(arch).phenomenon : "—";

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
    solarSeason,
    declination,
    polarity,
    anchor,
    cosmicAnalogue,
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
  const arch = run.primary_archetype ?? "—";
  const cosmicAnalogue = arch && arch !== "—" ? getCosmicAnalogue(arch).phenomenon : "—";
  return {
    archetype: arch,
    variationKey: run.variationKey ?? "—",
    dateTime: "—",
    location: "—",
    solarAzimuth: "—",
    lightSeasonSegment: "—",
    solarSeason: "—",
    declination: "—",
    polarity: "—",
    anchor: "—",
    cosmicAnalogue,
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
  /** When true, layers ignis-glyph-overlay (existing overlay system) above the image. */
  showGlyphOverlay = false,
  /** "square" for 1:1 composed cards (object-contain, no crop); default for 16:9 backgrounds (object-cover). */
  aspectRatio = "video",
  /** When true, uses registry-dossier styling (smaller radius, no shadow, system controls). */
  registryVariant = false,
}) {
  const src = imageUrl || PLACEHOLDER_SVG;
  const defaultScrim = overlayStyle === "highContrast" ? "light" : "dark";
  const [scrimVariant, setScrimVariant] = useState(defaultScrim);
  const isSquare = aspectRatio === "square";
  const aspectClass = isSquare ? "aspect-square" : "aspect-[4/3] sm:aspect-[3/4]";
  const objectClass = isSquare ? "object-contain" : "object-cover";

  const cardClass = registryVariant
    ? "relative overflow-hidden rounded-lg border border-[var(--artifact-panel-border)] bg-[var(--beauty-cream)] registry-artifact-card"
    : "relative overflow-hidden rounded-xl border border-[var(--artifact-panel-border)] bg-[var(--beauty-cream)]";
  const cardStyle = registryVariant ? undefined : { boxShadow: "0 4px 24px rgba(0,0,0,0.08)" };

  return (
    <div
      className={`${cardClass} ${className}`}
      style={cardStyle}
    >
      <div className="flex flex-col sm:flex-row w-full min-w-0 overflow-hidden">
        <ArtifactInfoPanel artifacts={artifacts} showDevFields={showDevFields} registryVariant={registryVariant} />
        <div className={`relative flex-1 min-w-0 w-full ${aspectClass}`}>
          <img
            src={src}
            alt={imageAlt}
            className={`w-full h-full ${objectClass}`}
          />
          {showGlyphOverlay && (() => {
            const config = getArchetypePreviewConfig(archetype);
            if (!config.hasGlyph) return null;
            return (
              <img
                src={config.glyphPath}
                alt=""
                aria-hidden
                className="archetype-glyph-overlay"
              />
            );
          })()}
          <ArchetypeNameOverlay archetype={archetype} scrimVariant={scrimVariant} registryVariant={registryVariant} />
          <button
            type="button"
            className={registryVariant
              ? "absolute top-2 right-2 z-10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded border border-[#2a2a2e] text-[#9a9aa0] hover:border-[#7A4FFF]/40 hover:text-[#c8c8cc] font-mono bg-[#0a0a0b]/80"
              : "absolute top-2 right-2 z-10 px-2 py-1 text-[10px] uppercase tracking-wider rounded bg-black/20 text-white/90 hover:bg-black/30 border border-white/10"}
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
