/**
 * DALL·E 2 image edits (image-conditioned generation).
 * Used for glyph-conditioned backgrounds: glyph as anchor, environment grows from it.
 *
 * Requires: square PNG image, square PNG mask (transparent = edit, opaque = preserve).
 * Output: 1024x1024 only (DALL·E 2 limits).
 */

export const PROVIDER_NAME_EDITS = "dalle2_edits";

export interface GenerateEditsOptions {
  imageBuffer: Buffer;
  maskBuffer: Buffer;
  prompt: string;
}

export interface ImageResult {
  url?: string;
  b64?: string;
}

export async function generateImagesViaEdits(
  opts: GenerateEditsOptions
): Promise<ImageResult[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const prompt = opts.prompt.slice(0, 1000);

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey });

  const imagePart = new Uint8Array(opts.imageBuffer);
  const maskPart = new Uint8Array(opts.maskBuffer);
  const imageFile = new File([imagePart], "image.png", { type: "image/png" });
  const maskFile = new File([maskPart], "mask.png", { type: "image/png" });

  const res = await client.images.edit({
    model: "dall-e-2",
    image: imageFile,
    mask: maskFile,
    prompt,
    n: 1,
    size: "1024x1024",
    response_format: "url",
  });

  const url = res.data?.[0]?.url;
  const results: ImageResult[] = url ? [{ url }] : [];
  return results;
}
