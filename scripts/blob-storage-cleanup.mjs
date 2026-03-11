#!/usr/bin/env node
/**
 * Blob storage manual cleanup — conservative; no cron.
 *
 * SAFE TO PURGE (by design):
 *   health/  — timestamped txt from GET /api/waitlist/health; unbounded growth if pinged often.
 *
 * NOT DELETED BY THIS SCRIPT (retention unclear or durable):
 *   ligs-reports/, ligs-beauty/, ligs-images/, ligs-waitlist/entries/,
 *   ligs-keepers/, ligs-keepers-dry/, ligs-exemplars/, ligs-runs/
 *
 * Usage:
 *   node scripts/blob-storage-cleanup.mjs --prefix health/ --dry-run
 *   node scripts/blob-storage-cleanup.mjs --prefix health/ --execute
 *
 * --execute actually calls del(). Without it, only lists what would be deleted.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { list, del } from "@vercel/blob";

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

/** Only prefixes explicitly allowed for purge in this first step. */
const PURGE_ALLOWED = new Set(["health/"]);

async function listAllUnderPrefix(prefix) {
  const out = [];
  let cursor;
  for (;;) {
    const res = await list({
      prefix,
      limit: 1000,
      cursor,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    out.push(...res.blobs);
    if (!res.cursor) break;
    cursor = res.cursor;
  }
  return out;
}

async function main() {
  loadEnv();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN not set.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const prefixIdx = args.indexOf("--prefix");
  const prefix =
    prefixIdx >= 0 && args[prefixIdx + 1] ? args[prefixIdx + 1] : null;
  const execute = args.includes("--execute");
  const dryRun = args.includes("--dry-run") || !execute;

  if (!prefix) {
    console.error("Required: --prefix <prefix>");
    console.error("Allowed prefixes for purge:", [...PURGE_ALLOWED].join(" "));
    process.exit(1);
  }

  if (!prefix.endsWith("/")) {
    console.error("Prefix must end with / (e.g. health/)");
    process.exit(1);
  }

  if (!PURGE_ALLOWED.has(prefix)) {
    console.error(
      `Prefix not allowed for purge: ${prefix}\n` +
        `Allowed: ${[...PURGE_ALLOWED].join(", ")}\n` +
        `Other prefixes require clear retention rules before any delete.`
    );
    process.exit(1);
  }

  const blobs = await listAllUnderPrefix(prefix);
  console.log(`Prefix ${prefix} — ${blobs.length} object(s)`);
  if (blobs.length === 0) {
    process.exit(0);
  }

  if (dryRun) {
    console.log("Dry run — no deletes. Pass --execute to delete.");
    for (const b of blobs.slice(0, 20)) {
      console.log("  would delete:", b.pathname);
    }
    if (blobs.length > 20) console.log(`  ... and ${blobs.length - 20} more`);
    process.exit(0);
  }

  let deleted = 0;
  for (const b of blobs) {
    try {
      await del(b.url, { token });
      deleted++;
      console.log("deleted:", b.pathname);
    } catch (e) {
      console.error("delete failed:", b.pathname, e?.message || e);
    }
  }
  console.log(`Done. Deleted ${deleted}/${blobs.length}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
