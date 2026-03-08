/**
 * Archetype preview configuration: display names, static image paths, sample artifact URLs, teasers.
 * Static images from public/arc-static-images/.
 * Used by TerminalResolutionSequence, ArchetypeArtifactCard, InteractiveReportSequence, PreviewRevealSequence.
 */

import { IGNIS_LANDING_URL } from "./exemplar-store";
import { LIGS_ARCHETYPES } from "./archetypes";
import { getArchetypeStaticImagePath } from "./archetype-static-images";

/** Teaser shape: civilizationFunction (string), environments (array of strings). */
const TEASER_BY_ARCHETYPE = {
  Ignispectrum: {
    civilizationFunction: "Initiation",
    environments: ["Founders", "Explorers", "Innovators"],
  },
  Stabiliora: {
    civilizationFunction: "Stabilization",
    environments: ["System maintainers", "Institution builders", "Long-term planners"],
  },
  Duplicaris: {
    civilizationFunction: "Replication",
    environments: ["Pattern multipliers", "Template users", "Scale operators"],
  },
  Tenebris: {
    civilizationFunction: "Nocturne",
    environments: ["Night workers", "Depth seekers", "Shadow integrators"],
  },
  Radiantis: {
    civilizationFunction: "Radiance",
    environments: ["Beacon holders", "Light amplifiers", "Inspiration carriers"],
  },
  Precisura: {
    civilizationFunction: "Precision",
    environments: ["Detail specialists", "Boundary definers", "Measurement experts"],
  },
  Aequilibris: {
    civilizationFunction: "Equilibrium",
    environments: ["Bridge builders", "Mediators", "Balance keepers"],
  },
  Obscurion: {
    civilizationFunction: "Obfuscation",
    environments: ["Veil holders", "Mystery preservers", "Threshold guardians"],
  },
  Vectoris: {
    civilizationFunction: "Direction",
    environments: ["Path finders", "Trajectory setters", "Vector definers"],
  },
  Structoris: {
    civilizationFunction: "Structure",
    environments: ["Framework builders", "Architects", "Order imposers"],
  },
  Innovaris: {
    civilizationFunction: "Innovation",
    environments: ["Prototype makers", "First movers", "Paradigm shifters"],
  },
  Fluxionis: {
    civilizationFunction: "Flow",
    environments: ["Adaptation specialists", "Change agents", "Transition guides"],
  },
};

/** Config entries for all archetypes. archetypeStaticImagePath from arc-static-images. */
export const ARCHETYPE_PREVIEW_CONFIG = {};
for (const arch of LIGS_ARCHETYPES) {
  const imagePath = getArchetypeStaticImagePath(arch);
  ARCHETYPE_PREVIEW_CONFIG[arch] = {
    displayName: arch.toUpperCase(),
    archetypeStaticImagePath: imagePath ?? null,
    sampleArtifactUrl: arch === "Ignispectrum" ? IGNIS_LANDING_URL : null,
    teaser: TEASER_BY_ARCHETYPE[arch] ?? {
      civilizationFunction: "—",
      environments: ["—"],
    },
  };
}

/**
 * Get preview config for an archetype. Returns displayName, archetypeStaticImagePath, sampleArtifactUrl,
 * hasArchetypeVisual, hasSampleArtifact, teaser. Unknown archetypes get displayName = archetype.toUpperCase(),
 * archetypeStaticImagePath=null, sampleArtifactUrl=null, hasArchetypeVisual=false, hasSampleArtifact=false, teaser with "—".
 */
export function getArchetypePreviewConfig(archetype) {
  if (!archetype || typeof archetype !== "string") {
    return {
      displayName: "—",
      archetypeStaticImagePath: null,
      sampleArtifactUrl: null,
      hasArchetypeVisual: false,
      hasSampleArtifact: false,
      teaser: { civilizationFunction: "—", environments: "—" },
    };
  }
  const key = archetype.trim();
  const config = ARCHETYPE_PREVIEW_CONFIG[key];
  if (config) {
    const teaser = config.teaser ?? { civilizationFunction: "—", environments: "—" };
    const envStr =
      Array.isArray(teaser.environments) ? teaser.environments.join(" • ") : (teaser.environments ?? "—");
    return {
      displayName: config.displayName,
      archetypeStaticImagePath: config.archetypeStaticImagePath ?? null,
      sampleArtifactUrl: config.sampleArtifactUrl ?? null,
      hasArchetypeVisual: Boolean(config.archetypeStaticImagePath),
      hasSampleArtifact: Boolean(config.sampleArtifactUrl),
      teaser: { civilizationFunction: teaser.civilizationFunction ?? "—", environments: envStr },
    };
  }
  return {
    displayName: archetype.toUpperCase(),
    archetypeStaticImagePath: null,
    sampleArtifactUrl: null,
    hasArchetypeVisual: false,
    hasSampleArtifact: false,
    teaser: { civilizationFunction: "—", environments: "—" },
  };
}

/**
 * Build a data URL for a dark card with archetype name when no sample artifact exists.
 */
export function buildPlaceholderSvg(displayName) {
  const name = displayName && typeof displayName === "string" ? displayName : "ARCHETYPE";
  const encoded = encodeURIComponent(name);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230d0d0f' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em' font-family='ui-monospace,sans-serif'%3E${encoded}%3C/text%3E%3C/svg%3E`;
}
