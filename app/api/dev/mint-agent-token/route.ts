/**
 * POST /api/dev/mint-agent-token
 * Dev-only: mints an agent entitlement token for a reportId when report + profile exist.
 * Used for local E2E testing of WHOIS, feedback, and drift-check without Stripe.
 *
 * Requires: NODE_ENV !== "production"
 * Body: { reportId: string }
 * Returns: { token, reportId }
 */

import { NextResponse } from "next/server";
import { getReport } from "@/lib/report-store";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";
import {
  getAgentEntitlementByReportId,
  mintAgentEntitlementToken,
  saveAgentEntitlement,
} from "@/lib/agent-entitlement-store";
import { log } from "@/lib/log";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "DEV_ONLY",
        message: "mint-agent-token is dev-only; not available in production",
      },
      { status: 403 }
    );
  }

  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/dev/mint-agent-token" });

  let body: { reportId?: string };
  try {
    body = (await request.json()) as { reportId?: string };
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Body must be JSON" },
      { status: 400 }
    );
  }

  const reportId =
    typeof body?.reportId === "string" ? body.reportId.trim() : "";
  if (!reportId) {
    return NextResponse.json(
      { error: "MISSING_REPORT_ID", message: "reportId is required" },
      { status: 400 }
    );
  }

  const report = await getReport(reportId);
  if (!report) {
    return NextResponse.json(
      {
        error: "REPORT_NOT_FOUND",
        message: "No report found for this reportId",
        reportId,
      },
      { status: 404 }
    );
  }

  try {
    await loadBeautyProfileV1(reportId, requestId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "BEAUTY_PROFILE_NOT_FOUND",
        message:
          "Beauty profile not found. Run dry-run with BLOB_READ_WRITE_TOKEN set first.",
        reportId,
      },
      { status: 404 }
    );
  }

  const existing = await getAgentEntitlementByReportId(reportId);
  if (existing?.status === "active") {
    log("info", "mint_agent_token_reused", { requestId, reportId });
    return NextResponse.json({
      token: existing.token,
      reportId,
      reused: true,
    });
  }

  const token = mintAgentEntitlementToken();
  await saveAgentEntitlement({
    token,
    reportId,
    status: "active",
    createdAt: Date.now(),
  });

  log("info", "mint_agent_token_created", {
    requestId,
    reportId,
    tokenPrefix: token.slice(0, 12),
  });

  return NextResponse.json({ token, reportId, reused: false });
}
