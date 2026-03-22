/**
 * GET /api/agent/prior — Vector Zero prior layer only.
 * Same auth as GET /api/agent/whois. Returns derived_structure, agent_guidance, agent_summary.
 * Minimal wrapper; no measured_context, verification, or deep model data.
 */

import { NextResponse } from "next/server";

const PRIOR_KEYS = [
  "derived_structure",
  "agent_guidance",
  "agent_summary",
] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reportId = url.searchParams.get("reportId")?.trim();
  const auth = request.headers.get("authorization") ?? "";
  const bearerToken = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const token = bearerToken || url.searchParams.get("token")?.trim() || "";

  if (!reportId) {
    return NextResponse.json(
      { error: "MISSING_REPORT_ID", message: "reportId is required" },
      { status: 400 }
    );
  }
  if (!token) {
    return NextResponse.json(
      { error: "MISSING_TOKEN", message: "Entitlement token is required" },
      { status: 401 }
    );
  }

  const origin = request.headers.get("x-forwarded-host")
    ? `https://${request.headers.get("x-forwarded-host")}`
    : new URL(request.url).origin;
  const whoisUrl = `${origin}/api/agent/whois?reportId=${encodeURIComponent(reportId)}`;

  let whoisRes: Response;
  try {
    whoisRes = await fetch(whoisUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    console.error("[agent/prior] whois fetch failed:", e);
    return NextResponse.json(
      { error: "UPSTREAM_FAILED", reportId },
      { status: 502 }
    );
  }

  if (!whoisRes.ok) {
    const body = await whoisRes.json().catch(() => ({}));
    return NextResponse.json(
      body?.error ? { error: body.error, message: body.message } : { error: "UPSTREAM_ERROR" },
      { status: whoisRes.status }
    );
  }

  const full = (await whoisRes.json()) as Record<string, unknown>;
  const prior: Record<string, unknown> = {
    schema: "whois-your-human/prior/v1",
    reportId,
  };
  for (const key of PRIOR_KEYS) {
    if (full[key] != null) prior[key] = full[key];
  }

  return NextResponse.json(prior);
}
