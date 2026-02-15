#!/usr/bin/env node
/**
 * Local/dev only — not used by Vercel build or production.
 *
 * Purpose: Verifies engine + report API wiring without calling OpenAI.
 *
 * Requirements:
 *   - DRY_RUN=1 in env (and dev server started with that env).
 *   - Dev server running (npm run dev).
 *
 * Usage: node scripts/test-engine-wiring.mjs [port]
 *   Default port is 3000 if omitted.
 *
 * Loads .env.local if present (for local runs only).
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const port = process.argv[2] || process.env.PORT || "3000";

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
if (process.env.DRY_RUN !== "1") {
  console.error("Set DRY_RUN=1 in your env and restart the dev server, then run this script again.");
  process.exit(1);
}

const base = `http://127.0.0.1:${port}`;

async function main() {
  let ok = true;

  // 1) Missing required fields → 400
  const badRes = await fetch(`${base}/api/engine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName: "X" }),
  });
  if (badRes.status !== 400) {
    console.error("FAIL: expected 400 for missing fields, got", badRes.status);
    ok = false;
  } else {
    console.log("OK: missing required fields → 400");
  }

  // 2) Valid body → 200, shape { status, reportId, emotional_snippet, image_prompts }
  const body = {
    fullName: "Test User",
    birthDate: "1990-01-15",
    birthTime: "14:30",
    birthLocation: "New York, NY",
    email: "test@example.com",
  };
  const res = await fetch(`${base}/api/engine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("FAIL: POST /api/engine returned", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const hasShape =
    data.status === "ok" &&
    typeof data.reportId === "string" &&
    typeof data.emotional_snippet === "string" &&
    Array.isArray(data.image_prompts) &&
    data.image_prompts.length === 2;
  if (!hasShape) {
    console.error("FAIL: unexpected response shape", JSON.stringify(data, null, 2));
    ok = false;
  } else {
    console.log("OK: POST /api/engine → 200, correct shape");
  }

  // 3) GET /api/report/:id returns full_report
  const reportRes = await fetch(`${base}/api/report/${data.reportId}`);
  if (!reportRes.ok) {
    console.error("FAIL: GET /api/report/:id returned", reportRes.status);
    ok = false;
  } else {
    const report = await reportRes.json();
    if (typeof report.full_report !== "string" || report.full_report.length === 0) {
      console.error("FAIL: full_report missing or empty");
      ok = false;
    } else {
      console.log("OK: GET /api/report/:id → full_report populated");
    }
  }

  if (ok) console.log("\nAll wiring checks passed. You can turn off DRY_RUN for real reports.");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("Error:", err.message);
  if (err.cause?.code === "ECONNREFUSED") {
    console.error("Start the dev server first: npm run dev");
  }
  process.exit(1);
});
