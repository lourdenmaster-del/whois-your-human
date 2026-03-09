/**
 * Archetype preview configuration: display names, static image paths, sample artifact URLs, teasers.
 * Static images from public/arc-static-images/.
 * Teaser content (humanExpression, civilizationFunction, archetypalVoice, environments) from canonical archetype contract.
 * Used by TerminalResolutionSequence, ArchetypeArtifactCard, InteractiveReportSequence, PreviewRevealSequence.
 */

import { IGNIS_LANDING_URL } from "./exemplar-store";
import { LIGS_ARCHETYPES } from "./archetypes";
import { getArchetypeStaticImagePath } from "./archetype-static-images";
import { getArchetypePreviewDescriptor } from "@/src/ligs/archetypes/adapters";

/** Config entries for all archetypes. archetypeStaticImagePath from arc-static-images; teaser from contract. */
export const ARCHETYPE_PREVIEW_CONFIG = {};
for (const arch of LIGS_ARCHETYPES) {
  const imagePath = getArchetypeStaticImagePath(arch);
  const preview = getArchetypePreviewDescriptor(arch);
  ARCHETYPE_PREVIEW_CONFIG[arch] = {
    displayName: arch.toUpperCase(),
    archetypeStaticImagePath: imagePath ?? null,
    sampleArtifactUrl: arch === "Ignispectrum" ? IGNIS_LANDING_URL : null,
    teaser: {
      humanExpression: preview.humanExpression,
      civilizationFunction: preview.civilizationFunction,
      archetypalVoice: preview.archetypalVoice,
      environments: preview.environments,
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
      teaser: { humanExpression: "—", civilizationFunction: "—", archetypalVoice: "—", environments: "—" },
    };
  }
  const key = archetype.trim();
  const config = ARCHETYPE_PREVIEW_CONFIG[key];
  if (config) {
    const teaser = config.teaser ?? { humanExpression: "—", civilizationFunction: "—", archetypalVoice: "—", environments: "—" };
    const envStr =
      Array.isArray(teaser.environments) ? teaser.environments.join(" • ") : (teaser.environments ?? "—");
    return {
      displayName: config.displayName,
      archetypeStaticImagePath: config.archetypeStaticImagePath ?? null,
      sampleArtifactUrl: config.sampleArtifactUrl ?? null,
      hasArchetypeVisual: Boolean(config.archetypeStaticImagePath),
      hasSampleArtifact: Boolean(config.sampleArtifactUrl),
      teaser: {
        humanExpression: teaser.humanExpression ?? "—",
        civilizationFunction: teaser.civilizationFunction ?? "—",
        archetypalVoice: teaser.archetypalVoice ?? "—",
        environments: envStr,
      },
    };
  }
  return {
    displayName: archetype.toUpperCase(),
    archetypeStaticImagePath: null,
    sampleArtifactUrl: null,
    hasArchetypeVisual: false,
    hasSampleArtifact: false,
    teaser: { humanExpression: "—", civilizationFunction: "—", archetypalVoice: "—", environments: "—" },
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
