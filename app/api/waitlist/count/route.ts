/**
 * GET /api/waitlist/count — Public-safe.
 * Returns only { total } for landing registry readout.
 * No auth. No emails or internal data.
 */

import { NextResponse } from "next/server";
import { getWaitlistCount } from "@/lib/waitlist-list";

const SEED_REGISTRY_COUNT = 117;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const realCount = await getWaitlistCount();
    return NextResponse.json({ total: realCount + SEED_REGISTRY_COUNT });
  } catch (err) {
    console.error("[waitlist/count] getWaitlistCount failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ total: SEED_REGISTRY_COUNT });
  }
}
