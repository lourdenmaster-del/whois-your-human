/**
 * Constraint Gate — post-generation scan for forbidden terms in full_report.
 * Used by engine/generate to trigger a repair pass when forbidden content is detected.
 */

export const FORBIDDEN_PATTERNS: Array<{ key: string; re: RegExp }> = [
  { key: "light_identity_grid_system", re: /\blight\s+identity\s+grid\s+system\b/i },
  { key: "may_indicate", re: /\bmay\s+indicate\b/i },
  { key: "tends_to", re: /\btends\s+to\b/i },
  { key: "you_tend_to", re: /\byou\s+tend\s+to\b/i },
  { key: "your_type", re: /\byour\s+type\b/i },
  { key: "people_like_you", re: /\bpeople\s+like\s+you\b/i },
  { key: "cognitive", re: /\bcognitive\b/i },
  { key: "introspection", re: /\bintrospection\b/i },
  { key: "chakra", re: /\bchakra(s)?\b/i },
  { key: "sushumna", re: /\bsushumna\b/i },
  { key: "anahata", re: /\banahata\b/i },
  { key: "ajna", re: /\bajna\b/i },
  { key: "kabbalah", re: /\bkabbalah\b/i },
  { key: "sefirot", re: /\bsefirot\b/i },
  { key: "tree of life", re: /\btree\s+of\s+life\b/i },
  { key: "sacred geometry", re: /\bsacred\s+geometry\b/i },
  { key: "phi", re: /\bphi\b/i },
  { key: "golden ratio", re: /\bgolden\s+ratio\b/i },
  { key: "axis mundi", re: /\baxis\s+mundi\b/i },
  { key: "alchemy", re: /\balchemy\b/i },
  { key: "hermetic", re: /\bhermetic\b/i },
  { key: "as above so below", re: /\bas\s+above\s+so\s+below\b/i },
  { key: "schumann", re: /\bschumann\b/i },
  { key: "venusian", re: /\bvenusian\b/i },
  { key: "saturnine", re: /\bsaturnine\b/i },
  { key: "jupiterian", re: /\bjupiterian\b/i },
  { key: "piscean", re: /\bpiscean\b/i },
  { key: "fibonacci", re: /\bfibonacci\b/i },
  { key: "ancient traditions", re: /\bancient\s+traditions\b/i },
  { key: "legends hold", re: /\blegends\s+hold\b/i },
  { key: "esoteric anatomy", re: /\besoteric\s+anatomy\b/i },
];

/**
 * Scans text for forbidden patterns. Returns deduplicated list of matched keys.
 */
export function scanForbidden(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const seen = new Set<string>();
  for (const { key, re } of FORBIDDEN_PATTERNS) {
    if (re.test(text)) seen.add(key);
  }
  return Array.from(seen);
}

/**
 * Simple redaction: replaces matches of given forbidden keys with [removed].
 * Used when repair pass still leaves hits.
 */
export function redactForbidden(text: string, keys: string[]): string {
  if (!text || !keys.length) return text;
  const keySet = new Set(keys);
  let result = text;
  for (const { key, re } of FORBIDDEN_PATTERNS) {
    if (keySet.has(key)) result = result.replace(re, "[removed]");
  }
  return result;
}
