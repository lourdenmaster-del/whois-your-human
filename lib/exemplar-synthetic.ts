/**
 * Deterministic synthetic exemplar data — Tier B only.
 * Assembles sections and fullReport from existing descriptor, phrase bank, cosmic analogue, solar season.
 * No LLM calls. No new lore.
 */

import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import { getArchetypePhraseBank } from "@/src/ligs/voice/archetypePhraseBank";
import { getOverlayCopyBank } from "@/src/ligs/archetypes/adapters";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import {
  getSolarSeasonForArchetype,
  eclipticLongitudeToDeclination,
  type SolarSeasonEntry,
} from "@/src/ligs/astronomy/solarSeason";
import { getArchetypeVisualMapShape } from "@/src/ligs/archetypes/adapters";
import type { LigsArchetype } from "@/src/ligs/voice/schema";

export interface ExemplarBackfill {
  solarSeason: string | null;
  declination: string | null;
  anchor: string | null;
  cosmicAnalogue: string | null;
  variationKey: string | null;
  colorFamily: string | null;
  textureBias: string | null;
  /** Sample birth-context fields for exemplar display (Ignis only). */
  dateTime?: string | null;
  location?: string | null;
  solarAzimuth?: string | null;
  lightSeasonSegment?: string | null;
}

/**
 * LOCKED: Canonical sample dataset for exemplar-Ignispectrum.
 * Used on the public Ignis sample page (/beauty/view?reportId=exemplar-Ignispectrum).
 * Do NOT modify without explicit approval. This dataset is stable for public feedback.
 * Future archetypes may define their own sample datasets; the Ignis branch remains isolated.
 */
const IGNIS_SAMPLE_CONTEXT = {
  subjectName: "Ignispectrum",
  dateTime: "March 21, 1987 — 10:32 AM",
  location: "Lisbon, Portugal",
  solarAzimuth: "182°",
  lightSeasonSegment: "0–30° (center 15°)",
};

export interface ExemplarSyntheticSections {
  light_signature: { raw_signal: string; custodian: string; oracle: string };
  archetype: { raw_signal: string; custodian: string; oracle: string };
  deviations: { raw_signal: string; custodian: string; oracle: string };
  corrective_vector: { raw_signal: string; custodian: string; oracle: string };
}

function formatDeclination(deg: number): string {
  const sign = deg >= 0 ? "+" : "";
  return `${sign}${deg.toFixed(2)}°`;
}

function formatSolarSeasonDisplay(entry: SolarSeasonEntry): string {
  return `${entry.lonStartDeg}–${entry.lonEndDeg}° (center ${entry.lonCenterDeg}°)`;
}

/** Build backfill for exemplar artifact panel from archetype mappings. */
export function buildExemplarBackfill(
  archetype: string,
  manifestVersion?: string
): ExemplarBackfill {
  const season = getSolarSeasonForArchetype(archetype);
  const cosmic = getCosmicAnalogue(archetype as LigsArchetype);
  const visual = getArchetypeVisualMapShape(archetype);

  const solarSeason = season ? formatSolarSeasonDisplay(season) : null;
  const declination = season
    ? formatDeclination(eclipticLongitudeToDeclination(season.lonCenterDeg))
    : null;
  const anchor = season?.anchorType ?? null;
  const cosmicAnalogue = cosmic?.phenomenon ?? null;
  const variationKey = manifestVersion ? `exemplar-${manifestVersion}` : null;
  const colorFamily = visual?.palette?.length ? visual.palette[0] ?? null : null;
  const textureBias = visual?.texture_level ?? null;

  const base: ExemplarBackfill = {
    solarSeason,
    declination,
    anchor,
    cosmicAnalogue,
    variationKey,
    colorFamily,
    textureBias,
  };

  if (archetype === "Ignispectrum") {
    return {
      ...base,
      dateTime: IGNIS_SAMPLE_CONTEXT.dateTime,
      location: IGNIS_SAMPLE_CONTEXT.location,
      solarAzimuth: IGNIS_SAMPLE_CONTEXT.solarAzimuth,
      lightSeasonSegment: IGNIS_SAMPLE_CONTEXT.lightSeasonSegment,
    };
  }

  return base;
}

/** Build synthetic three-voice sections for exemplar. */
export function buildExemplarSyntheticSections(archetype: string): ExemplarSyntheticSections | null {
  const descriptor = getMarketingDescriptor(archetype);
  const phraseBank = getArchetypePhraseBank(archetype as LigsArchetype);
  const overlay = getOverlayCopyBank(archetype);
  const cosmic = getCosmicAnalogue(archetype as LigsArchetype);

  if (!descriptor || !phraseBank) return null;

  const sensory = phraseBank.sensoryMetaphors[0] ?? "light at the edge of perception";
  const behavioral = phraseBank.behavioralTells[0] ?? "pattern in action";
  const relational = phraseBank.relationalTells[0] ?? "resonance with others";
  const shadow = phraseBank.shadowDrift[0] ?? "drift under stress";
  const reset = phraseBank.resetMoves[0] ?? "pause and recalibrate";

  const tagline = descriptor.tagline ?? descriptor.archetypeLabel ?? archetype;
  const hit0 = descriptor.hitPoints?.[0] ?? "";
  const hit1 = descriptor.hitPoints?.[1] ?? "";
  const subhead = overlay.subheads?.[0] ?? tagline;
  const phenomenon = cosmic?.phenomenon ?? "light behavior";

  return {
    light_signature: {
      raw_signal: `${phenomenon}. ${sensory}.`,
      custodian: `${tagline}. ${hit0}.`,
      oracle: subhead,
    },
    archetype: {
      raw_signal: behavioral,
      custodian: `${descriptor.archetypeLabel}. ${hit1}.`,
      oracle: relational,
    },
    deviations: {
      raw_signal: shadow,
      custodian: `Typical drift for this archetype: ${shadow}.`,
      oracle: `Recognition without judgment.`,
    },
    corrective_vector: {
      raw_signal: reset,
      custodian: `Reset move: ${reset}.`,
      oracle: `Return to baseline through action.`,
    },
  };
}

/** Build synthetic fullReport string for FullReportAccordion. */
export function buildExemplarFullReport(archetype: string): string | null {
  const sections = buildExemplarSyntheticSections(archetype);
  const descriptor = getMarketingDescriptor(archetype);
  const phraseBank = getArchetypePhraseBank(archetype as LigsArchetype);
  const cosmic = getCosmicAnalogue(archetype as LigsArchetype);

  if (!sections || !descriptor || !phraseBank) return null;

  const hitPoints = descriptor.hitPoints ?? [];
  const resetMoves = phraseBank.resetMoves ?? [];
  const phenomenon = cosmic?.phenomenon ?? "";
  const description = cosmic?.description ?? "";

  const lines: string[] = [
    "═══ SAMPLE LIGHT IDENTITY RECORD ═══",
    "",
    "1. LIGHT SIGNATURE",
    "─────────────────",
    sections.light_signature.raw_signal,
    sections.light_signature.custodian,
    sections.light_signature.oracle,
    "",
    "2. ARCHETYPE",
    "─────────────",
    sections.archetype.raw_signal,
    sections.archetype.custodian,
    sections.archetype.oracle,
    "",
    "3. DEVIATIONS",
    "─────────────",
    sections.deviations.raw_signal,
    sections.deviations.custodian,
    "",
    "4. CORRECTIVE VECTOR",
    "────────────────────",
    sections.corrective_vector.raw_signal,
    sections.corrective_vector.custodian,
    "",
    "5. KEY MOVES",
    "────────────",
    ...resetMoves.map((m) => `• ${m}`),
    "",
    "Cosmic analogue: " + phenomenon,
    description,
  ];

  return lines.join("\n");
}
