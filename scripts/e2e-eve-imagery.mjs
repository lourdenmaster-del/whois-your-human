#!/usr/bin/env node
/**
 * Local/dev only — not used by Vercel build or production.
 *
 * Full E2E test: E.V.E. → LIGS → imagery pipeline.
 * 1. POST /api/engine with Marilyn Monroe payload
 * 2. Saves full JSON response
 * 3. Calls /api/generate-image for each of the 3 beauty imagery slugs
 * 4. Prints Blob/API URLs and storage paths for all artifacts
 *
 * Requires: dev server running (npm run dev), OPENAI_API_KEY and BLOB_READ_WRITE_TOKEN in env (e.g. .env.local for local runs).
 * Usage: node scripts/e2e-eve-imagery.mjs [baseUrl]
 * Default baseUrl: http://localhost:3000
 *
 * If the E.V.E. request times out (Node fetch default ~300s), run with:
 *   UNDICI_HEADERS_TIMEOUT=600000 node scripts/e2e-eve-imagery.mjs
 * (10 min for engine + E.V.E. filter)
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const path = join(root, ".env.local");
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch (_) {}
}

loadEnvLocal();

const baseUrl = process.argv[2] || "http://localhost:3000";

const PAYLOAD = {
  fullName: "Marilyn Monroe",
  birthDate: "1926-06-01",
  birthTime: "09:30",
  birthLocation: "Los Angeles, California, USA",
  email: "marilyn@test.com",
  mode: "beauty",
};

const IMAGERY_SLUGS = [
  "vector_zero_beauty_field",
  "light_signature_aesthetic_field",
  "final_beauty_field",
];

const EVE_TIMEOUT_MS = 600000; // 10 min for engine + E.V.E. filter
const GEN_IMAGE_TIMEOUT_MS = 120000; // 2 min per image

async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(t);
    return res;
  } catch (e) {
    clearTimeout(t);
    if (e.name === "AbortError") throw new Error(`Request timed out after ${ms / 1000}s`);
    throw e;
  }
}

async function main() {
  console.log("=== E2E: E.V.E. → LIGS → imagery pipeline ===\n");
  console.log("1. POST", baseUrl + "/api/engine", "with Marilyn Monroe payload (timeout", EVE_TIMEOUT_MS / 60000, "min)...\n");

  const eveRes = await fetchWithTimeout(
    `${baseUrl}/api/engine`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(PAYLOAD),
    },
    EVE_TIMEOUT_MS
  );

  const eveBody = await eveRes.json();

  if (!eveRes.ok) {
    console.error("E.V.E. request failed:", eveRes.status, eveBody);
    process.exit(1);
  }

  const reportId = eveBody.reportId;
  const imageryPrompts = eveBody.imagery_prompts || {};
  const artifactsDir = join(__dirname, "artifacts");
  mkdirSync(artifactsDir, { recursive: true });
  const outPath = join(artifactsDir, "e2e-eve-response.json");
  writeFileSync(outPath, JSON.stringify(eveBody, null, 2), "utf8");
  console.log("2. Full JSON response saved to:", outPath, "\n");
  console.log("--- Full API response (E.V.E.) ---");
  console.log(JSON.stringify(eveBody, null, 2));
  console.log("\n--- End response ---\n");

  if (!reportId) {
    console.error("No reportId in response.");
    process.exit(1);
  }

  console.log("3. Triggering 3 image generations (reportId:", reportId, ")...\n");
  const imageUrls = {};
  for (const slug of IMAGERY_SLUGS) {
    const prompt = imageryPrompts[slug];
    if (!prompt) {
      console.warn("No prompt for slug:", slug);
      continue;
    }
    const genRes = await fetchWithTimeout(
      `${baseUrl}/api/generate-image`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, reportId, slug }),
      },
      GEN_IMAGE_TIMEOUT_MS
    );
    const genData = await genRes.json();
    if (!genRes.ok) {
      console.error("generate-image failed for", slug, ":", genData);
      imageUrls[slug] = null;
    } else {
      imageUrls[slug] = genData.url;
      console.log("  ", slug, "→", genData.url);
    }
  }

  console.log("\n4. Fetching report and beauty profile for URLs...\n");
  const reportRes = await fetch(`${baseUrl}/api/report/${reportId}`);
  const reportData = reportRes.ok ? await reportRes.json() : null;
  const beautyRes = await fetch(`${baseUrl}/api/report/${reportId}/beauty`);
  const beautyData = beautyRes.ok ? await beautyRes.json() : null;

  console.log("--- Blob / API URLs and storage paths ---\n");

  const reportApiUrl = `${baseUrl}/api/report/${reportId}`;
  const beautyApiUrl = `${baseUrl}/api/report/${reportId}/beauty`;

  console.log("Full LIGS report:");
  console.log("  API URL (content):", reportApiUrl);
  console.log("  Storage path:     ligs-reports/" + reportId + ".json");
  if (reportData?.emotional_snippet) {
    console.log("  Snippet (first 120 chars):", reportData.emotional_snippet.slice(0, 120) + "...");
  }

  console.log("\nBeauty profile:");
  console.log("  API URL (content):", beautyApiUrl);
  console.log("  Storage path:     ligs-beauty/" + reportId + ".json");

  console.log("\nSummary / snippet:");
  console.log("  In report JSON:   emotional_snippet");
  if (reportData?.emotional_snippet) {
    console.log("  Value:", reportData.emotional_snippet);
  }

  console.log("\nImagery prompts (from beauty profile):");
  const prompts = beautyData?.imagery_prompts || imageryPrompts;
  for (const slug of IMAGERY_SLUGS) {
    const p = prompts[slug];
    console.log("  ", slug + ":", (p && p.slice(0, 80)) + (p && p.length > 80 ? "..." : ""));
  }

  console.log("\nGenerated images (Blob URLs):");
  for (const slug of IMAGERY_SLUGS) {
    const url = imageUrls[slug];
    console.log("  ", slug + ":", url || "(failed or missing)");
  }

  console.log("\n5. Artifacts written to Blob (when BLOB_READ_WRITE_TOKEN is set):");
  console.log("  - ligs-reports/" + reportId + ".json   (full LIGS report)");
  console.log("  - ligs-beauty/" + reportId + ".json   (E.V.E. Beauty Profile)");
  console.log("  - ligs-images/" + reportId + "/vector_zero_beauty_field.png");
  console.log("  - ligs-images/" + reportId + "/light_signature_aesthetic_field.png");
  console.log("  - ligs-images/" + reportId + "/final_beauty_field.png");
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
