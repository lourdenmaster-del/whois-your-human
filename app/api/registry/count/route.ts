/**
 * GET /api/registry/count — Public-safe.
 * Returns { total } — count of reports in ligs-reports/ (humans registered).
 * No auth. No seed.
 */

import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { getStorageInfo, getMemoryReportIds, BLOB_PREFIX } from "@/lib/report-store";

export const dynamic = "force-dynamic";

async function getTotalCount(): Promise<number> {
  const info = getStorageInfo();
  if (info.storage === "memory") {
    return getMemoryReportIds().length;
  }
  let total = 0;
  let cursor: string | undefined;
  let hasMore = false;
  do {
    const res = await list({ prefix: BLOB_PREFIX, limit: 1000, cursor });
    total += res.blobs.length;
    hasMore = res.hasMore ?? false;
    cursor = res.cursor;
  } while (hasMore && cursor);
  return total;
}

export async function GET() {
  try {
    const total = await getTotalCount();
    return NextResponse.json({ total });
  } catch (err) {
    console.error("[registry/count] failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ total: 0 });
  }
}
