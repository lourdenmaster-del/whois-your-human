/**
 * Deterministic exemplar cards for landing Examples gallery.
 * No API calls. Used when blob previews are empty or fail.
 */

export interface ExemplarCard {
  reportId: string;
  subjectName: string;
  emotionalSnippet: string;
  dominantArchetype: string;
  imageUrls: string[];
}

export const EXEMPLAR_CARDS: ExemplarCard[] = [
  {
    reportId: "exemplar-stabiliora",
    subjectName: "Example",
    emotionalSnippet:
      "A resonance between structure and expression — the Light Signature reveals coherence where pattern meets possibility.",
    dominantArchetype: "Stabiliora",
    imageUrls: ["/exemplars/stabiliora.png"],
  },
  {
    reportId: "exemplar-ignispectrum",
    subjectName: "Example",
    emotionalSnippet:
      "The forces that shape identity imprint a unique pattern — warmth and intensity define the baseline.",
    dominantArchetype: "Ignispectrum",
    imageUrls: ["/exemplars/ignispectrum.png"],
  },
  {
    reportId: "exemplar-radiantis",
    subjectName: "Example",
    emotionalSnippet:
      "Radiant clarity emerges from the interplay of light and form — a luminous signature that endures.",
    dominantArchetype: "Radiantis",
    imageUrls: ["/exemplars/radiantis.png"],
  },
  {
    reportId: "exemplar-tenebris",
    subjectName: "Example",
    emotionalSnippet:
      "Depth and shadow reveal what brightness obscures — the Light Signature maps the unseen dimensions.",
    dominantArchetype: "Tenebris",
    imageUrls: ["/exemplars/tenebris.png"],
  },
  {
    reportId: "exemplar-precisura",
    subjectName: "Example",
    emotionalSnippet:
      "Precision and clarity align — the aesthetic field captures the exact contours of identity.",
    dominantArchetype: "Precisura",
    imageUrls: ["/exemplars/precisura.png"],
  },
  {
    reportId: "exemplar-fluxionis",
    subjectName: "Example",
    emotionalSnippet:
      "Flow and transformation — the Light Signature traces movement through time and possibility.",
    dominantArchetype: "Fluxionis",
    imageUrls: ["/exemplars/fluxionis.png"],
  },
];
