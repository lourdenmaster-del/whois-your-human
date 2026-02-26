import { VoiceProfileSchema, type VoiceProfile } from "./schema";

/**
 * Non-throwing normalization step.
 * - Applies defaults via Zod
 * - Trims strings in common fields (light touch)
 */
export function normalizeVoiceProfile(input: unknown): VoiceProfile | null {
  const parsed = VoiceProfileSchema.safeParse(input);
  if (!parsed.success) return null;

  const vp = parsed.data;

  // light trim
  vp.brand.name = vp.brand.name.trim();
  vp.descriptors = vp.descriptors.map((d) => d.trim()).filter(Boolean);

  // dedupe lexicon (case-insensitive)
  const dedupe = (arr: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const w of arr) {
      const k = w.trim().toLowerCase();
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(w.trim());
    }
    return out;
  };

  vp.lexicon.preferred_words = dedupe(vp.lexicon.preferred_words);
  vp.lexicon.avoid_words = dedupe(vp.lexicon.avoid_words);
  vp.lexicon.banned_words = dedupe(vp.lexicon.banned_words);

  return vp;
}
