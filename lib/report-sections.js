/**
 * Shared report section data for both InteractiveReportSequence and ReportDocument.
 * Single source of truth for section titles, lines, and artifact image props.
 */

import { getArchetypePreviewConfig, buildPlaceholderSvg } from "@/lib/archetype-preview-config";
import {
  getArchetypeFamilyUrlsForPreview,
  pickArchetypeFamilyImage,
} from "@/lib/archetype-public-assets";
import {
  composeArchetypeOpening,
  composeArchetypeSummary,
  composeLightExpression,
  composeCosmicTwin,
  composeReturnToCoherence,
} from "@/lib/report-composition";

/**
 * Build section data for the report. Used by step-by-step sequence and dossier document.
 * @param {object} profile - Beauty profile from GET /api/beauty/[reportId]
 * @returns {Array<object>} Steps with id, title, lines, hasImage, and optional image props
 */
export function getReportSections(profile) {
  if (!profile) return [];

  const arch = profile?.dominantArchetype ?? "Ignispectrum";
  const config = getArchetypePreviewConfig(arch);

  const baselineImage = profile?.imageUrls?.[0];
  const lightSignatureImage = profile?.imageUrls?.[1];
  const finalArtifactImage = profile?.imageUrls?.[2];
  const bestImage =
    lightSignatureImage ??
    baselineImage ??
    finalArtifactImage ??
    config.sampleArtifactUrl ??
    buildPlaceholderSvg(config.displayName);

  const hasArcFamily = getArchetypeFamilyUrlsForPreview(arch).length > 0;
  const chosenArcImage = hasArcFamily ? pickArchetypeFamilyImage(arch, profile?.reportId ?? "") : null;
  const overlayImage = chosenArcImage ?? (config.hasArchetypeVisual ? config.archetypeStaticImagePath : null);
  const useArcFamilyOverlay = !!chosenArcImage;

  const openingLines = composeArchetypeOpening(profile, config);
  const summaryLines = composeArchetypeSummary(profile);
  const archetypalVoice = config.teaser?.archetypalVoice;
  if (archetypalVoice && archetypalVoice !== "—") {
    summaryLines.push(archetypalVoice.endsWith(".") ? archetypalVoice : `${archetypalVoice}.`);
  }
  const lightLines = composeLightExpression(profile);
  const cosmicLines = composeCosmicTwin(profile);
  const returnLines = composeReturnToCoherence(profile);

  return [
    { id: "archetype-resolved", title: "ARCHETYPE RESOLVED", lines: openingLines, hasImage: false },
    {
      id: "archetype-summary",
      title: "ARCHETYPE SUMMARY",
      lines: summaryLines.length > 0 ? summaryLines : [],
      hasImage: false,
    },
    { id: "light-expression", title: "LIGHT EXPRESSION", lines: lightLines, hasImage: false },
    { id: "cosmic-twin", title: "COSMIC TWIN RELATION", lines: cosmicLines, hasImage: false },
    {
      id: "artifact-reveal",
      title: "ARTIFACT REVEAL",
      lines: [],
      hasImage: true,
      imageSrc: bestImage,
      baselineImage,
      lightSignatureImage,
      finalArtifactImage,
      archetypeImagePath: overlayImage,
      useArcFamilyOverlay,
      displayName: config.displayName,
      humanExpression: config.teaser?.humanExpression ?? null,
    },
    {
      id: "return-next",
      title: "RETURN TO COHERENCE",
      lines: returnLines,
      hasImage: false,
      isLast: true,
    },
  ];
}
