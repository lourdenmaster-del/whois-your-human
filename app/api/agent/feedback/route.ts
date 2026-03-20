import { NextResponse } from "next/server";
import {
  getAgentEntitlementByToken,
  saveAgentFeedback,
} from "@/lib/agent-entitlement-store";

type FeedbackState = "confirmed" | "partial" | "debunked";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const bearerToken = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const token = bearerToken;
  if (!token) {
    return NextResponse.json(
      { error: "MISSING_TOKEN", message: "Entitlement token is required" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const reportId =
    typeof body.reportId === "string" ? body.reportId.trim() : "";
  const state = body.state as FeedbackState;
  const metrics = body.metrics;
  const notes =
    typeof body.notes === "string" && body.notes.trim() !== ""
      ? body.notes.trim()
      : undefined;

  if (!reportId) {
    return NextResponse.json({ error: "MISSING_REPORT_ID" }, { status: 400 });
  }
  if (state !== "confirmed" && state !== "partial" && state !== "debunked") {
    return NextResponse.json({ error: "INVALID_STATE" }, { status: 400 });
  }
  if (!isPlainObject(metrics)) {
    return NextResponse.json({ error: "INVALID_METRICS" }, { status: 400 });
  }

  const entitlement = await getAgentEntitlementByToken(token);
  if (!entitlement) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 403 });
  }
  if (entitlement.status !== "active" || entitlement.reportId !== reportId) {
    return NextResponse.json({ error: "TOKEN_NOT_AUTHORIZED" }, { status: 403 });
  }

  await saveAgentFeedback({
    reportId,
    state,
    metrics,
    notes,
    createdAt: Date.now(),
    token,
  });

  return NextResponse.json({ ok: true });
}
