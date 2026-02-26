/**
 * Terms that must not appear in generated prompts (brand names, trademarks, etc.)
 * Add entries as needed; prompts are checked case-insensitively.
 */
const PROMPT_DENYLIST = [
  "nike",
  "adidas",
  "apple",
  "google",
  "meta",
  "amazon",
  "microsoft",
  "coca-cola",
  "pepsi",
  "starbucks",
  "mcdonald's",
  "mcdonalds",
  "gucci",
  "louis vuitton",
  "chanel",
  "dior",
  "prada",
  "versace",
  "hermes",
  "cartier",
  "rolex",
  "tiffany",
  "disney",
  "marvel",
  "pixar",
  "netflix",
  "spotify",
  "uber",
  "airbnb",
  "tesla",
  "instagram",
  "facebook",
  "twitter",
  "tiktok",
  "youtube",
  "linkedin",
  "snapchat",
  "whatsapp",
  "paypal",
  "stripe",
  "slack",
  "zoom",
  "salesforce",
  "adobe",
  "ibm",
  "oracle",
  "samsung",
  "sony",
  "huawei",
  "oppo",
  "vivo",
  "xiaomi",
  "oneplus",
];

/**
 * Sanitize prompt by removing any denylist terms (case-insensitive).
 * Returns the sanitized prompt.
 */
export function sanitizePromptForDenylist(prompt: string): string {
  let result = prompt;
  const lower = prompt.toLowerCase();

  for (const term of PROMPT_DENYLIST) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    if (re.test(lower)) {
      result = result.replace(re, "").replace(/\s{2,}/g, " ").trim();
    }
  }

  return result;
}
