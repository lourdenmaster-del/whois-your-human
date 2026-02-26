#!/usr/bin/env node
/**
 * Ignispectrum centerline profile – LIVE generation of marketing_background + share_card.
 *
 * Profile: Name: Ignispectrum Archetype, April 4, 1990, 12:00 PM, Quito, Ecuador
 * Solar midpoint Aries (~15°). No dry run.
 *
 * Prerequisites:
 *   - Dev server running: npm run dev
 *   - .env.local: ALLOW_EXTERNAL_WRITES=true, OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN
 *
 * Run: node scripts/run-ignispectrum-centerline.mjs
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

const IGNISPECTRUM_PROFILE = {
  id: "ignispectrum-centerline",
  version: "1.0.0",
  created_at: "1990-04-04T12:00:00.000Z",
  owner_user_id: "centerline",
  brand: { name: "Ignispectrum Archetype", products: [], audience: "" },
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
};

async function generate(purpose, idempotencyKey) {
  const body = {
    profile: IGNISPECTRUM_PROFILE,
    purpose,
    image: { aspectRatio: "16:9", size: "1024", count: 1 },
    variationKey: "centerline-a15",
    idempotencyKey,
  };
  const res = await fetch(`${BASE}/api/image/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  console.log("\n=== Ignispectrum Centerline — LIVE generation ===\n");
  console.log("Profile: Ignispectrum Archetype");
  console.log("Date: April 4, 1990 | Time: 12:00 PM | Location: Quito, Ecuador");
  console.log("Solar: Aries midpoint (~15°)\n");

  const id1 = crypto.randomUUID();
  const id2 = crypto.randomUUID();

  try {
    console.log("1. Generating marketing_background...");
    const bg = await generate("marketing_background", id1);
    console.log(`   requestId: ${bg.requestId}`);
    console.log(`   dryRun: ${bg.dryRun}`);
    console.log(`   providerUsed: ${bg.providerUsed ?? "—"}`);
    console.log(`   cacheHit: ${bg.cacheHit ?? false}`);
    if (bg.images?.length > 0) {
      const img = bg.images[0];
      const url = img?.url ?? (img?.b64 ? "data:image/png;base64,..." : "—");
      console.log(`   image: ${url}`);
    } else if (bg.dryRun) {
      console.log("   (DRY_RUN — no image; set ALLOW_EXTERNAL_WRITES=true)");
    }

    console.log("\n2. Generating share_card...");
    const sc = await generate("share_card", id2);
    console.log(`   requestId: ${sc.requestId}`);
    console.log(`   dryRun: ${sc.dryRun}`);
    console.log(`   providerUsed: ${sc.providerUsed ?? "—"}`);
    console.log(`   cacheHit: ${sc.cacheHit ?? false}`);
    if (sc.images?.length > 0) {
      const img = sc.images[0];
      const url = img?.url ?? (img?.b64 ? "data:image/png;base64,..." : "—");
      console.log(`   image: ${url}`);
    } else if (sc.dryRun) {
      console.log("   (DRY_RUN — no image; set ALLOW_EXTERNAL_WRITES=true)");
    }

    console.log("\n=== Done ===\n");
  } catch (e) {
    console.error("\nError:", e.message);
    process.exit(1);
  }
}

main();
