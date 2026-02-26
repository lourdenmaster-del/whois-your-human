/**
 * Image generation provider (OpenAI DALL-E 3).
 *
 * Size mapping (aspectRatio → DALL-E 3 size string):
 * - 1:1  → 1024x1024
 * - 16:9 → 1792x1024
 * - 9:16 → 1024x1792
 * - 4:5  → 1024x1024 (DALL-E 3 has no native 4:5; use square)
 *
 * Note: Our schema's size param ("1024"|"1536") is reserved for future use
 * (e.g. quality tier or upscale); DALL-E 3 dimensions are driven by aspectRatio.
 */
export const ASPECT_TO_DALLE_SIZE: Record<string, string> = {
  "1:1": "1024x1024",
  "16:9": "1792x1024",
  "9:16": "1024x1792",
  "4:5": "1024x1024",
};

const PROVIDER_NAME = "dall-e-3";

export interface GenerateImagesOptions {
  positive: string;
  negative: string;
  aspectRatio: string;
  count: number;
}

export interface ImageResult {
  url?: string;
  b64?: string;
}

export async function generateImagesViaProvider(
  opts: GenerateImagesOptions
): Promise<ImageResult[]> {
  const dalleSize = ASPECT_TO_DALLE_SIZE[opts.aspectRatio] ?? "1024x1024";
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey });

  // DALL-E 3 does not support negative prompts; append Avoid clause
  const negativeClause = opts.negative
    ? ` Avoid: ${opts.negative}.`
    : "";
  const fullPrompt = `${opts.positive}${negativeClause}`.slice(0, 4000);

  const results: ImageResult[] = [];

  for (let i = 0; i < opts.count; i++) {
    const res = await client.images.generate({
      model: PROVIDER_NAME,
      prompt: fullPrompt,
      n: 1,
      size: dalleSize as "1024x1024" | "1792x1024" | "1024x1792",
      quality: "standard",
      response_format: "url",
    });
    const url = res.data?.[0]?.url;
    if (url) results.push({ url });
  }

  return results;
}

export { PROVIDER_NAME };
