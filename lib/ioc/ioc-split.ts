const INTRO_SUFFIX = "Apply the following behavior rules immediately and consistently:\n\n";
const FOOTER_START = "\n\nThese rules override default response behavior.";

export function extractRuleBulletLines(full: string): string[] {
  const start = full.indexOf(INTRO_SUFFIX);
  if (start === -1) return [];
  const from = start + INTRO_SUFFIX.length;
  const end = full.indexOf(FOOTER_START, from);
  if (end === -1) return [];
  const section = full.slice(from, end);
  return section.split("\n").filter((line) => line.startsWith("- "));
}

/** Free tier: first 3 rule bullets only; omits correction footer line. */
export function buildIocFreeBlock(full: string): string {
  const headEnd = full.indexOf(INTRO_SUFFIX);
  if (headEnd === -1) return full.trim();
  const prefix = full.slice(0, headEnd + INTRO_SUFFIX.length);
  const bullets = extractRuleBulletLines(full);
  const three = bullets.slice(0, 3).join("\n");
  if (!three) return full.trim();
  return (prefix + three + "\n\nThese rules override default response behavior.").trim();
}

export function normalizeIocBlockForClipboard(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}
