#!/usr/bin/env node
import { list, get, put } from "@vercel/blob";

const PREFIXES = [
  "ligs-agent-entitlements/by-token/",
  "ligs-agent-entitlements/by-report/",
  "ligs-agent-feedback/",
];

const isApply = process.argv.includes("--apply");

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is required.");
  process.exit(1);
}

async function listAll(prefix) {
  const pathnames = [];
  let cursor;
  let hasMore = true;
  while (hasMore) {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const b of page.blobs ?? []) pathnames.push(b.pathname);
    hasMore = page.hasMore === true;
    cursor = page.cursor;
    if (!hasMore) break;
    if (!cursor) break;
  }
  return pathnames;
}

async function readBlob(pathname) {
  try {
    const privateRead = await get(pathname, { access: "private" });
    if (privateRead?.statusCode === 200 && privateRead.stream) {
      const text = await new Response(privateRead.stream).text();
      return { text, mode: "private" };
    }
  } catch {}

  try {
    const publicRead = await get(pathname, { access: "public" });
    if (publicRead?.statusCode === 200 && publicRead.stream) {
      const text = await new Response(publicRead.stream).text();
      return { text, mode: "public" };
    }
  } catch {}

  return null;
}

async function main() {
  let total = 0;
  let readable = 0;
  let historicallyPublic = 0;
  let rewritten = 0;
  let failed = 0;

  for (const prefix of PREFIXES) {
    const keys = await listAll(prefix);
    total += keys.length;
    for (const pathname of keys) {
      const loaded = await readBlob(pathname);
      if (!loaded) {
        failed += 1;
        continue;
      }
      readable += 1;
      if (loaded.mode === "public") historicallyPublic += 1;

      if (isApply) {
        try {
          await put(pathname, loaded.text, {
            access: "private",
            addRandomSuffix: false,
            contentType: "application/json",
          });
          rewritten += 1;
        } catch {
          failed += 1;
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: isApply ? "apply" : "audit",
        total,
        readable,
        historicallyPublic,
        rewritten,
        failed,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
