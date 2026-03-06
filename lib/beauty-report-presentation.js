/**
 * Presentation-layer utilities for Beauty report display.
 * Sanitizes content for WHOIS-style registry display. No engine changes.
 */

const FIELD_REFERENCE_RE = /Field reference:\s*\(L\)\s+resolved as\s+\w+\s+with Vector Zero coherence\s+([\d.]+|unknown)\.\s*\n\n/gi;

/** Career/profession phrases to remove (avoids speculation about destiny or career paths). */
const CAREER_PHRASES = [
  /\burban planner\b/gi,
  /\bteam management\b/gi,
  /\bcommunity organizer\b/gi,
  /\btechnology development\b/gi,
  /\bcreative arts\b/gi,
  /\broles?\s+like\s+(?:teacher|operator|organizer|responder|builder|analyst|caretaker)\b/gi,
  /\b(?:teacher|operator|organizer|responder|builder|analyst|caretaker)(?:\s+or\s+\w+)*\s+appear\s+frequently\b/gi,
];

/** Vague phrases to remove or soften (Oracle filler; emphasize observable human experience). */
const VAGUE_PHRASES = [
  /\bstability unfolds as integrated coherence\b/gi,
  /\bcoherence unfolds\s+(?:as|into)\s+/gi,
  /\b(?:merely|only)\s+(?:balance|stability|coherence)\b/gi,
  /\bcoherence manifests as lived experience\b/gi,
  /\bcoherence manifests as\s+\w+\s+experience\b/gi,
  /\bstructured integration of environmental influence\b/gi,
  /\bintegrated coherence\s+(?:unfolds|manifests)\b/gi,
  /\blived experience\s+(?:of|as)\s+coherence\b/gi,
];

/**
 * Keep "Field reference: (L) resolved as X with Vector Zero coherence Y." only once at the start.
 * Removes repeated occurrences from sections 2–14.
 */
export function deduplicateFieldReference(text) {
  if (!text || typeof text !== "string") return text;
  const firstMatch = text.match(FIELD_REFERENCE_RE);
  if (!firstMatch) return text;
  let seen = false;
  return text.replace(FIELD_REFERENCE_RE, (match) => {
    if (seen) return "";
    seen = true;
    return match;
  });
}

/**
 * Remove career/profession suggestions from displayed text.
 */
export function removeCareerSuggestions(text) {
  if (!text || typeof text !== "string") return text;
  let out = text;
  for (const re of CAREER_PHRASES) {
    out = out.replace(re, "").replace(/\s{2,}/g, " ").trim();
  }
  return out.replace(/^[.,;\s]+|[.,;\s]+$/g, "").trim();
}

/**
 * Remove vague or speculative phrasing.
 */
export function removeVaguePhrases(text) {
  if (!text || typeof text !== "string") return text;
  let out = text;
  for (const re of VAGUE_PHRASES) {
    out = out.replace(re, "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

/**
 * Sanitize text for registry display: remove career suggestions and vague phrasing.
 * Use deduplicateFieldReference separately for full-report strings.
 */
export function sanitizeForDisplay(text) {
  if (!text || typeof text !== "string") return text;
  return removeVaguePhrases(removeCareerSuggestions(text));
}
