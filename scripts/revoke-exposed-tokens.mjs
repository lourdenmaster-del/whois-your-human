#!/usr/bin/env node
/**
 * Revoke exposed entitlement tokens (deploy prep).
 *
 * Usage:
 *   REPORT_IDS=id1,id2 node scripts/revoke-exposed-tokens.mjs
 *   node scripts/revoke-exposed-tokens.mjs --report-id <id>
 *   node scripts/revoke-exposed-tokens.mjs --token <wyh_xxx>
 *
 * Requires: BLOB_READ_WRITE_TOKEN in env (or .env.local).
 * Effect: Updates entitlement status to "revoked" in Blob. Revoked tokens fail
 * whois/prior/feedback/drift-check with 403 TOKEN_NOT_AUTHORIZED.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { get, put, list } from "@vercel/blob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const BY_TOKEN_PREFIX = "ligs-agent-entitlements/by-token/";
const BY_REPORT_PREFIX = "ligs-agent-entitlements/by-report/";

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

async function revokeByReportId(reportId) {
  const path = `${BY_REPORT_PREFIX}${reportId}.json`;
  try {
    const res = await get(path, { access: "public" });
    if (!res || res.statusCode !== 200 || !res.stream) return false;
    const text = await new Response(res.stream).text();
    const ent = JSON.parse(text);
    ent.status = "revoked";
    const payload = JSON.stringify(ent);
    await put(`${BY_TOKEN_PREFIX}${ent.token}.json`, payload, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      allowOverwrite: true,
    });
    await put(path, payload, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      allowOverwrite: true,
    });
    return true;
  } catch {
    return false;
  }
}

async function revokeByToken(token) {
  const path = `${BY_TOKEN_PREFIX}${token}.json`;
  try {
    const res = await get(path, { access: "public" });
    if (!res || res.statusCode !== 200 || !res.stream) return false;
    const text = await new Response(res.stream).text();
    const ent = JSON.parse(text);
    ent.status = "revoked";
    const payload = JSON.stringify(ent);
    await put(path, payload, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      allowOverwrite: true,
    });
    await put(`${BY_REPORT_PREFIX}${ent.reportId}.json`, payload, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      allowOverwrite: true,
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  loadEnv();
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN required.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  let reportIds = [];
  let tokensToRevoke = [];

  const doList = args.includes("--list");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--report-id" && args[i + 1]) {
      reportIds.push(args[i + 1].trim());
      i++;
    } else if (args[i] === "--token" && args[i + 1]) {
      tokensToRevoke.push(args[i + 1].trim());
      i++;
    }
  }

  if (doList) {
    const { blobs } = await list({
      prefix: BY_REPORT_PREFIX,
      limit: 100,
    });
    const reportIdsFound = blobs
      .map((b) => (b.pathname || "").replace(BY_REPORT_PREFIX, "").replace(/\.json$/, ""))
      .filter(Boolean);
    if (reportIdsFound.length === 0) {
      console.log("No entitlements found in Blob.");
    } else {
      console.log("Entitlements (reportIds):");
      for (const id of reportIdsFound) {
        const res = await get(`${BY_REPORT_PREFIX}${id}.json`, { access: "public" });
        let status = "?";
        let tokenPrefix = "";
        if (res?.stream) {
          const text = await new Response(res.stream).text();
          try {
            const ent = JSON.parse(text);
            status = ent.status || "?";
            tokenPrefix = ent.token ? ent.token.slice(0, 16) + "..." : "";
          } catch (_) {}
        }
        console.log(`  ${id}  status=${status}  token=${tokenPrefix}`);
      }
    }
    return;
  }

  if (reportIds.length === 0 && tokensToRevoke.length === 0) {
    const envIds = (process.env.REPORT_IDS?.split(",") ?? []).map((s) => s.trim()).filter(Boolean);
    if (envIds.length > 0) {
      reportIds = envIds;
    }
  }

  if (reportIds.length === 0 && tokensToRevoke.length === 0) {
    console.error("Usage:");
    console.error("  node scripts/revoke-exposed-tokens.mjs --list           # List all entitlements");
    console.error("  node scripts/revoke-exposed-tokens.mjs --report-id <id> # Revoke by reportId");
    console.error("  node scripts/revoke-exposed-tokens.mjs --token <wyh_xxx># Revoke by token");
    console.error("  REPORT_IDS=id1,id2 node scripts/revoke-exposed-tokens.mjs");
    process.exit(1);
  }

  console.log("Revoking exposed entitlements...");

  for (const reportId of reportIds) {
    const ok = await revokeByReportId(reportId);
    console.log(ok ? `  revoked reportId=${reportId}` : `  no entitlement for reportId=${reportId}`);
  }

  for (const t of tokensToRevoke) {
    const ok = await revokeByToken(t);
    const prefix = t.slice(0, 16) + "...";
    console.log(ok ? `  revoked token ${prefix}` : `  no entitlement for token ${prefix}`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
