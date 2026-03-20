/**
 * GET /api/agent/inspect — Public machine-readable AI discovery endpoint.
 * No auth. JSON only. Stable and minimal.
 */

import { NextResponse } from "next/server";

function baseUrl(request: Request): string {
  try {
    const url = new URL(request.url);
    if (url.hostname === "ligs.io" || url.hostname === "www.ligs.io")
      return "https://ligs.io";
  } catch {}
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (u) return u.startsWith("http") ? u : `https://${u}`;
  const v = process.env.VERCEL_URL;
  if (v) return `https://${v}`;
  return "https://ligs.io";
}

export async function GET(request: Request) {
  const base = baseUrl(request);

  const body = {
    schema: "whois-your-human/inspect/v1",
    project: {
      name: "LIGS",
      protocol: "WHOIS YOUR HUMAN",
      description:
        "Agent-readable WHOIS record system. Helps AI tools adapt to a human's structure, patterns, and decision style via a tokenized calibration record.",
    },
    public_resources: {
      landing: `${base}/whois-your-human`,
      unlock: `${base}/whois-your-human/unlock`,
      api_reference: `${base}/whois-your-human/api`,
      case_studies: `${base}/whois-your-human/case-studies`,
      case_studies_detail: [
        `${base}/whois-your-human/case-studies/wyh-001`,
        `${base}/whois-your-human/case-studies/wyh-001-b`,
        `${base}/whois-your-human/case-studies/wyh-004`,
        `${base}/whois-your-human/case-studies/wyh-005`,
      ],
    },
    stance: {
      get: `${base}/api/agent/stance`,
      post: `${base}/api/agent/stance`,
      values: ["endorse", "decline", "abstain"],
    },
    protected: {
      whois: {
        endpoint: `${base}/api/agent/whois`,
        method: "GET",
        auth: "Authorization: Bearer <wyh_token>",
        query: "reportId=<UUID>",
      },
    },
    recommended_inspection_order: [
      "1. Read landing and protocol overview",
      "2. Read API reference",
      "3. Review case studies and calibration artifacts",
      "4. GET /api/agent/stance to see aggregate verdicts",
      "5. Optionally POST stance (endorse/decline/abstain) after inspection",
    ],
  };

  return NextResponse.json(body);
}
