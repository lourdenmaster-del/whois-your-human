/**
 * Run to print ACTUAL Ignispectrum marketing_background + share_card provider prompts:
 *   PRINT_IGNISPECTRUM_PROMPT=1 npx vitest run src/ligs/image/__tests__/printIgnispectrumPrompt.test.ts
 *
 * Same path as Studio LIVE: profile → buildImagePromptSpec → triangulation → provider string.
 */
import { describe, it } from "vitest";
import { parseVoiceProfile } from "../../voice/schema";
import { buildImagePromptSpec } from "../buildImagePromptSpec";
import { buildProviderPromptString } from "../triangulatePrompt";

const ignispectrumProfile = parseVoiceProfile({
  id: "studio-ignispectrum-demo",
  version: "1.0.0",
  created_at: "2025-02-20T12:00:00.000Z",
  owner_user_id: "u1",
  brand: { name: "LIGS", products: [], audience: "" },
  ligs: {
    primary_archetype: "Ignispectrum",
    secondary_archetype: null,
    blend_weights: {},
  },
  descriptors: ["energetic", "vivid", "transformative"],
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

function printPrompt(purpose: string, positive: string, negative: string, full: string) {
  console.log(`\n========== IGNISPECTRUM ${purpose} — ACTUAL SYSTEM OUTPUT ==========\n`);
  console.log("--- POSITIVE ---\n");
  console.log(positive);
  console.log("\n--- NEGATIVE ---\n");
  console.log(negative);
  console.log("\n--- FULL (sent to provider) ---\n");
  console.log(full);
  console.log("\n========== END ==========\n");
}

describe("print Ignispectrum marketing_background + share_card prompts (run with PRINT_IGNISPECTRUM_PROMPT=1)", () => {
  it("generates prompt and prints when env var set", () => {
    if (process.env.PRINT_IGNISPECTRUM_PROMPT !== "1") return;

    const specBg = buildImagePromptSpec(ignispectrumProfile, {
      purpose: "marketing_background",
      aspectRatio: "16:9",
      size: "1024",
      count: 1,
      variationKey: "studio-demo",
    });
    const posBg = specBg.prompt.positive;
    const negBg = specBg.prompt.negative ?? "";
    printPrompt("marketing_background", posBg, negBg, buildProviderPromptString(posBg, negBg));

    const specShare = buildImagePromptSpec(ignispectrumProfile, {
      purpose: "share_card",
      aspectRatio: "16:9",
      size: "1024",
      count: 1,
      variationKey: "studio-demo",
    });
    const posShare = specShare.prompt.positive;
    const negShare = specShare.prompt.negative ?? "";
    printPrompt("share_card", posShare, negShare, buildProviderPromptString(posShare, negShare));
  });
});
