#!/usr/bin/env node
/**
 * Verify required env vars for Beauty generation. Prints missing names only (not values).
 * Loads .env.local when present.
 * Usage: node scripts/check-env.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch (_) {}
}
loadEnvLocal();

const REQUIRED = [
  ["OPENAI_API_KEY", "GPT-4o report and E.V.E. filter"],
  ["BLOB_READ_WRITE_TOKEN", "Report and Beauty Profile storage"],
];
const DRY_RUN = process.env.DRY_RUN;

const missing = REQUIRED.filter(([key]) => !process.env[key]?.trim());
const dryRunOn = DRY_RUN === "1" || DRY_RUN === "true";

if (missing.length > 0) {
  console.error("Missing env vars (names only):");
  missing.forEach(([key]) => console.error("  -", key));
  process.exit(1);
}

if (dryRunOn) {
  console.error("DRY_RUN is set to 1 — real generation will use placeholders. Unset or set to 0 for real runs.");
}

console.log("Env OK: OPENAI_API_KEY and BLOB_READ_WRITE_TOKEN set.");
if (dryRunOn) console.log("(DRY_RUN=1 — generation will be placeholder)");
