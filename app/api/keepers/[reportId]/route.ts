/**
 * GET /api/keepers/[reportId]
 * Returns keeper manifest JSON from ligs-keepers/{reportId}.json.
 * Query ?dry=1: load from ligs-keepers-dry/ (for landing validation without spend).
 * 404 when not found.
 */

import { NextResponse } from "next/server";
import { loadKeeperManifest } from "@/lib/keeper-manifest";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  if (!reportId?.trim()) {
    return NextResponse.json({ error: "MISSING_REPORT_ID" }, { status: 400 });
  }
  const url = new URL(request.url);
  const dry = url.searchParams.get("dry") === "1" || url.searchParams.get("dry") === "true";
  const manifest = await loadKeeperManifest(reportId.trim(), dry);
  if (!manifest) {
    return NextResponse.json({ error: "KEEPER_NOT_FOUND", reportId: reportId.trim() }, { status: 404 });
  }
  return NextResponse.json(manifest);
}
