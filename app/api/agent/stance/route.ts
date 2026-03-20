/**
 * GET /api/agent/stance — Public. Returns aggregated endorse/decline/abstain counts.
 * POST /api/agent/stance — Public. Records a stance. No auth. Rate-limited. 1 per IP per 24h.
 */

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  getStanceCounts,
  recordStance,
  getIpFromRequest,
  type Stance,
} from "@/lib/agent-stance-store";

const VALID_STANCES: Stance[] = ["endorse", "decline", "abstain"];

function isStance(v: unknown): v is Stance {
  return typeof v === "string" && VALID_STANCES.includes(v as Stance);
}

export async function GET() {
  try {
    const counts = await getStanceCounts();
    return NextResponse.json({
      endorse: counts.endorse,
      decline: counts.decline,
      abstain: counts.abstain,
      schema: "whois-your-human/stance/v1",
    });
  } catch (err) {
    console.error("[agent/stance] GET failed:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", endorse: 0, decline: 0, abstain: 0 },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const hasBlobToken =
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0;
  if (!hasBlobToken) {
    return NextResponse.json(
      { error: "STANCE_NOT_CONFIGURED", message: "Blob storage not configured" },
      { status: 503 }
    );
  }

  try {
    await rateLimit(request, "agent_stance", 5, 60_000);
  } catch {
    return NextResponse.json(
      { error: "RATE_LIMIT_EXCEEDED", message: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const stance = obj?.stance;
  const rationale =
    typeof obj?.rationale === "string" ? obj.rationale : undefined;

  if (!isStance(stance)) {
    return NextResponse.json(
      {
        error: "INVALID_STANCE",
        message: "stance must be one of: endorse, decline, abstain",
      },
      { status: 400 }
    );
  }

  try {
    const ip = getIpFromRequest(request);
    const result = await recordStance(ip, stance, rationale);

    if (!result.ok) {
      const headers: HeadersInit = {};
      if (result.retryAfterSec != null) {
        headers["Retry-After"] = String(result.retryAfterSec);
      }
      return NextResponse.json(
        {
          error: result.reason,
          message: "One stance per IP per 24 hours",
        },
        { status: 429, headers }
      );
    }

    return NextResponse.json({
      ok: true,
      counts: result.counts,
      schema: "whois-your-human/stance/v1",
    });
  } catch (err) {
    console.error("[agent/stance] POST failed:", err);
    const message = err instanceof Error ? err.message : "Stance recording failed";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 }
    );
  }
}
