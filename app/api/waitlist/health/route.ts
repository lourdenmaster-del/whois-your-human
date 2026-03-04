/**
 * GET /api/waitlist/health — dev-only blob write verification.
 * No email, no PII, no secrets. Writes a tiny health-check file under health/ prefix.
 */

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

const HEALTH_PREFIX = "health/";

export async function GET() {
  const hasToken =
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0;

  if (!hasToken) {
    return NextResponse.json({
      ok: true,
      storage: "blob",
      canWrite: false,
    });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const pathname = `${HEALTH_PREFIX}${ts}.txt`;

  try {
    await put(pathname, `ok ${Date.now()}`, {
      access: "public",
      addRandomSuffix: false,
      contentType: "text/plain",
    });
    return NextResponse.json({
      ok: true,
      storage: "blob",
      canWrite: true,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      storage: "blob",
      canWrite: false,
    });
  }
}
