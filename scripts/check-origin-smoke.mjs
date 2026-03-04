#!/usr/bin/env node
/**
 * Origin landing smoke check — verifies production /origin and / serve correctly.
 * Asserts 200 response and key DOM markers exist. No runtime behavior changes.
 *
 * Run: npm run check:origin
 */

const BASE = "https://ligs.io";
const MARKERS = [
  "LIGS — Light Identity System",
  "Your Light Signature in three ways",
];

async function fetchAndCheck(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (res.status !== 200) {
    throw new Error(`${url} returned ${res.status} (expected 200)`);
  }
  const html = await res.text();
  for (const marker of MARKERS) {
    if (!html.includes(marker)) {
      throw new Error(`${url} missing marker: "${marker}"`);
    }
  }
  return true;
}

async function main() {
  try {
    await fetchAndCheck(`${BASE}/origin`);
    await fetchAndCheck(BASE);
    console.log("✓ Origin smoke check passed");
  } catch (err) {
    console.error("✗ Origin smoke check failed:", err.message);
    process.exit(1);
  }
}

main();
