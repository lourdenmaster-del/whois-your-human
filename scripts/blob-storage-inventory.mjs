#!/usr/bin/env node
/**
 * Blob storage inventory — read-only listing of known prefixes.
 * Uses BLOB_READ_WRITE_TOKEN from env (.env.local loaded if present).
 *
 * Usage:
 *   node scripts/blob-storage-inventory.mjs
 *   node scripts/blob-storage-inventory.mjs --prefix health/
 *
 * Does not delete anything. For purge, use blob-storage-cleanup.mjs (conservative).
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { list } from "@vercel/blob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const envLocal = resolve(root, ".env.local");
  if (existsSync(envLocal)) {
    const text = readFileSync(envLocal, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

/** Prefixes used by the app (factual map). Do not delete from this script without retention clarity. */
const KNOWN_PREFIXES = [
  { prefix: "ligs-reports/", note: "Engine reports JSON — durable" },
  { prefix: "ligs-beauty/", note: "Beauty Profile V1 JSON — durable" },
  { prefix: "ligs-images/", note: "Generated images per reportId — durable" },
  { prefix: "ligs-waitlist/entries/", note: "Waitlist signups — durable" },
  { prefix: "ligs-keepers/", note: "Keeper manifests — durable" },
  { prefix: "ligs-keepers-dry/", note: "Dry keeper manifests — dev/ephemeral" },
  { prefix: "ligs-exemplars/", note: "Exemplar packs — durable" },
  { prefix: "ligs-runs/", note: "Idempotency cache (engine/marketing/image-generate) — ephemeral" },
  { prefix: "health/", note: "Waitlist health check writes — ephemeral" },
];

async function countPrefix(prefix) {
  let cursor;
  let total = 0;
  const pathnames = [];
  for (;;) {
    const res = await list({
      prefix,
      limit: 1000,
      cursor,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    total += res.blobs.length;
    for (const b of res.blobs) pathnames.push(b.pathname);
    if (!res.cursor) break;
    cursor = res.cursor;
    if (total > 50000) {
      pathnames.push("... (truncated at 50k)");
      break;
    }
  }
  return { total, sample: pathnames.slice(0, 5) };
}

async function main() {
  loadEnv();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN not set. Cannot list Blob.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const prefixArg = args.indexOf("--prefix");
  const onlyPrefix =
    prefixArg >= 0 && args[prefixArg + 1] ? args[prefixArg + 1] : null;

  const rows = onlyPrefix
    ? [{ prefix: onlyPrefix, note: "(filter)" }]
    : KNOWN_PREFIXES;

  console.log("Blob inventory (read-only)\n");
  for (const { prefix, note } of rows) {
    try {
      const { total, sample } = await countPrefix(prefix);
      console.log(`${prefix}`);
      console.log(`  count: ${total}  |  ${note}`);
      if (sample.length) console.log(`  sample: ${sample.join(", ")}`);
    } catch (e) {
      console.log(`${prefix}`);
      console.log(`  error: ${e?.message || e}`);
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
