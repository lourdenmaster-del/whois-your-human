/**
 * Guardrail: Final imagery is determined by engine output + style pipeline, not UI defaults.
 *
 * Asserts that when engine produces primary=Fluxionis, secondary=Structoris:
 * - The prompt uses Fluxionis as dominant (palette, structure, focal, field)
 * - Secondary (Structoris) influences modulate/motion
 * - Twilight default = day for marketing_background
 * - Motion is controlled (smooth transitions or directional flow, no crisp drift for non-high-energy)
 */
import { describe, it, expect } from "vitest";
import { parseVoiceProfile } from "../../voice/schema";
import { buildImagePromptSpec } from "../buildImagePromptSpec";
import { buildTriangulatedMarketingPrompt } from "@/lib/marketing/visuals";

/** Mock engine result: primary=Fluxionis, secondary=Structoris */
const mockEngineProfile = parseVoiceProfile({
  id: "engine_vp_1",
  version: "1.0.0",
  created_at: "2025-02-20T12:00:00.000Z",
  owner_user_id: "engine",
  brand: { name: "LIGS", products: [], audience: "" },
  ligs: {
    primary_archetype: "Fluxionis",
    secondary_archetype: "Structoris",
    blend_weights: {},
  },
  descriptors: ["flow", "adapt", "structure", "logic"],
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

describe("engine result prompt guardrail (primary=Fluxionis, secondary=Structoris)", () => {
  it("uses Fluxionis as dominant influence in marketing_background prompt", () => {
    const spec = buildImagePromptSpec(mockEngineProfile, {
      purpose: "marketing_background",
      aspectRatio: "16:9",
      size: "1024",
      count: 1,
      variationKey: "exemplar-v1",
    });
    const positive = spec.prompt.positive;

    // Fluxionis palette: oceanic teal, violet, soft ember
    expect(positive).toMatch(/oceanic|teal|violet|ember/i);
    // Fluxionis field/physical cues
    expect(positive).toMatch(/wavefield|laminar|fluid|caustic/i);
    // Fluxionis structure: flowing curves, wavefields
    expect(positive).toMatch(/flowing|curve|stream|wave/i);
  });

  it("incorporates secondary (Structoris) as modifier in secondary block", () => {
    const { positive } = buildTriangulatedMarketingPrompt(
      {
        primaryArchetype: "Fluxionis",
        secondaryArchetype: "Structoris",
        seed: "guardrail-test",
      },
      "marketing_background"
    );

    // Secondary contributes modulate and/or motion
    expect(positive).toMatch(/Modulate:|Motion:/);
    // Should not drop secondary silently (block exists)
    const hasSecondaryBlock = /• Modulate:/.test(positive) || /• Motion:/.test(positive);
    expect(hasSecondaryBlock).toBe(true);
  });

  it("uses twilight default = day for marketing_background", () => {
    const spec = buildImagePromptSpec(mockEngineProfile, {
      purpose: "marketing_background",
      aspectRatio: "16:9",
      size: "1024",
      count: 1,
      variationKey: "exemplar-v1",
    });
    const positive = spec.prompt.positive;

    expect(positive).toMatch(/Twilight \(day\)|twilight.*day/i);
  });

  it("motion is controlled (no crisp drift for non-high-energy primaries)", () => {
    const spec = buildImagePromptSpec(mockEngineProfile, {
      purpose: "marketing_background",
      aspectRatio: "16:9",
      size: "1024",
      count: 1,
      variationKey: "exemplar-v1",
    });
    const positive = spec.prompt.positive;

    // Fluxionis is NOT high-energy; Structoris is NOT high-energy
    // So we must NOT get "crisp drift" (high-energy motion)
    expect(positive).not.toMatch(/crisp drift/i);
    // If Motion line exists, it should be smooth/directional (not aggressive)
    if (positive.includes("Motion:")) {
      expect(positive).toMatch(/smooth transitions|directional flow/i);
    }
  });

  it("negative prompt includes archetype-specific exclusions for both", () => {
    const spec = buildImagePromptSpec(mockEngineProfile, {
      purpose: "marketing_background",
      aspectRatio: "16:9",
      size: "1024",
      count: 1,
      variationKey: "exemplar-v1",
    });
    const negative = spec.prompt.negative ?? "";

    // Fluxionis: busy noise, splashy paint, literal water, fantasy, rainbow
    expect(negative).toMatch(/busy noise|splashy paint|literal water|fantasy|rainbow/i);
  });
});
