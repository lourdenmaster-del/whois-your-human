#!/usr/bin/env node
/**
 * CI guardrail: Fails if /signatures/* or /exemplars/* are referenced in code
 * but the corresponding files don't exist in public/.
 * Run: node scripts/check-landing-assets.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PATTERNS = [
  { re: /["'`]\/signatures\/([^"'`]+)["'`]/g, dir: "signatures" },
  { re: /["'`]\/exemplars\/([^"'`]+)["'`]/g, dir: "exemplars" },
];

const FILES_TO_SCAN = [
  "lib/exemplar-cards.ts",
  "app/beauty/BeautyLandingClient.jsx",
  "app/beauty/start/page.jsx",
];

const refs = new Set();

for (const p of FILES_TO_SCAN) {
  const path = join(root, p);
  if (!existsSync(path)) continue;
  const content = readFileSync(path, "utf8");
  for (const { re, dir } of PATTERNS) {
    for (const m of content.matchAll(re)) {
      refs.add(`${dir}/${m[1]}`);
    }
  }
}

let failed = false;
for (const ref of refs) {
  const fullPath = join(root, "public", ref);
  if (!existsSync(fullPath)) {
    console.error(`Missing: public/${ref} (referenced in code)`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`OK: ${refs.size} landing asset(s) verified`);
