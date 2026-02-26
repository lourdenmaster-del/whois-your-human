/**
 * Run to print ACTUAL Aequilibris marketing_background provider prompt:
 *   PRINT_AEQUILIBRIS_PROMPT=1 npx vitest run src/ligs/image/__tests__/printAequilibrisPrompt.test.ts
 *
 * Same path as Studio LIVE: profile → buildImagePromptSpec → triangulation → provider string.
 */
import { describe, it } from "vitest";
import { parseVoiceProfile } from "../../voice/schema";
import { buildImagePromptSpec } from "../buildImagePromptSpec";
import { buildProviderPromptString } from "../triangulatePrompt";

const aequilibrisProfile = parseVoiceProfile({
  id: "vp_studio",
  version: "1.0.0",
  created_at: "2025-02-20T12:00:00.000Z",
  owner_user_id: "u1",
  brand: { name: "LIGS Studio", products: [], audience: "" },
  ligs: {
    primary_archetype: "Aequilibris",
    secondary_archetype: null,
    blend_weights: {},
  },
  descriptors: ["balance", "harmony", "equilibrium", "elegant"],
  cadence: {
    sentence_length: { target_words: 14, range: [8, 22] },
    paragraph_length: { target_sentences: 2, range: [1, 4] },
  },
  lexicon: { preferred_words: [], avoid_words: [], banned_words: [] },
  formatting: {
    emoji_policy: "none",
    exclamation_policy: "rare",
    capitalization: "standard",
    bullets: "allowed",
    headline_style: "",
  },
  claims_policy: {
    medical_claims: "prohibited",
    before_after_promises: "prohibited",
    substantiation_required: true,
    allowed_phrasing: [],
  },
  channel_adapters: {},
  examples: { do: [], dont: [] },
});

describe("print Aequilibris marketing_background prompt (run with PRINT_AEQUILIBRIS_PROMPT=1)", () => {
  it("generates prompt and prints when env var set", () => {
    if (process.env.PRINT_AEQUILIBRIS_PROMPT !== "1") return;

    const specBg = buildImagePromptSpec(aequilibrisProfile, {
      purpose: "marketing_background",
      aspectRatio: "16:9",
      size: "1024",
      count: 1,
      variationKey: "exemplar-v1",
    });
    const posBg = specBg.prompt.positive;
    const negBg = specBg.prompt.negative ?? "";
    const full = buildProviderPromptString(posBg, negBg);

    console.log(`\n========== AEQUILIBRIS marketing_background — ACTUAL SYSTEM OUTPUT ==========\n`);
    console.log("--- POSITIVE ---\n");
    console.log(posBg);
    console.log("\n--- NEGATIVE ---\n");
    console.log(negBg);
    console.log("\n--- FULL (sent to provider) ---\n");
    console.log(full);
    console.log("\n========== END ==========\n");
  });
});
