#!/usr/bin/env node
/**
 * Verify idempotency: duplicate request with same idempotencyKey returns cached response.
 * Usage: node scripts/verify-idempotency.mjs [baseUrl]
 * Example: BASE=http://localhost:3000 node scripts/verify-idempotency.mjs
 *
 * Requires ALLOW_EXTERNAL_WRITES=false (DRY_RUN) for engine routes to avoid OpenAI calls.
 * Uses POST /api/image/generate which has LRU cache + idempotency.
 */

const baseUrl = process.env.BASE || process.argv[2] || "http://localhost:3000";
const idempotencyKey = "a1b2c3d4-e5f6-4789-a012-345678901234";

const profile = {
  id: "vp_idempotency_test",
  version: "1.0.0",
  created_at: new Date().toISOString(),
  owner_user_id: "test",
  brand: { name: "LIGS", products: [], audience: "" },
  ligs: { primary_archetype: "Stabiliora", secondary_archetype: null, blend_weights: {} },
  descriptors: ["Stabiliora"],
  cadence: { sentence_length: { target_words: 12, range: [6, 24] }, paragraph_length: { target_sentences: 3, range: [2, 6] }, rhythm_notes: "" },
  lexicon: { preferred_words: [], avoid_words: [], banned_words: [] },
  formatting: { emoji_policy: "none", exclamation_policy: "rare", capitalization: "standard", bullets: "allowed", headline_style: "clean minimal" },
  claims_policy: { medical_claims: "prohibited", before_after_promises: "prohibited", substantiation_required: true, allowed_phrasing: [] },
  channel_adapters: {},
  examples: { do: [], dont: [] },
};

const body = {
  profile,
  purpose: "idempotency_verify_test",
  image: { aspectRatio: "1:1", size: "1024", count: 1 },
  variationKey: "verify-1",
  idempotencyKey,
};

async function run() {
  console.log("Verifying idempotency on POST /api/image/generate");
  console.log("Base URL:", baseUrl);
  console.log("Idempotency key:", idempotencyKey);
  console.log("");

  const url = `${baseUrl}/api/image/generate`;

  // First request
  console.log("1. First request (cache miss, may call provider)...");
  const res1 = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data1 = await res1.json();
  if (!res1.ok) {
    console.error("First request failed:", data1);
    process.exit(1);
  }
  const requestId1 = data1.requestId;
  const idempotencyHit1 = data1.idempotencyHit === true;
  console.log(`   Status: ${res1.status}, requestId: ${requestId1}, idempotencyHit: ${idempotencyHit1}`);
  console.log("");

  // Duplicate request (same idempotencyKey)
  console.log("2. Duplicate request (same idempotencyKey)...");
  const res2 = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data2 = await res2.json();
  if (!res2.ok) {
    console.error("Duplicate request failed:", data2);
    process.exit(1);
  }
  const requestId2 = data2.requestId;
  const idempotencyHit2 = data2.idempotencyHit === true;
  console.log(`   Status: ${res2.status}, requestId: ${requestId2}, idempotencyHit: ${idempotencyHit2}`);
  console.log("");

  if (idempotencyHit2) {
    console.log("✅ SUCCESS: Duplicate request returned cached response (idempotencyHit: true)");
    console.log("   No new OpenAI/provider calls were made.");
  } else {
    console.log("⚠️  idempotencyHit was false on duplicate. Possible causes:");
    console.log("   - BLOB_READ_WRITE_TOKEN not set (in-memory store, new process = empty)");
    console.log("   - First request ran in different process/instance");
    console.log("   - ALLOW_EXTERNAL_WRITES=false (DRY) so Blob idempotency store may not persist");
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
