import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getReport } from "@/lib/report-store";
import { getAgentEntitlementByToken } from "@/lib/agent-entitlement-store";
import { log } from "@/lib/log";
import { killSwitchResponse } from "@/lib/api-kill-switch";

const DRIFT_PROMPT = `You are a baseline-comparison assistant. You compare current human text against a stored WHOIS calibration baseline. You do NOT diagnose, therapize, or measure true emotional state. You only assess whether the current text appears aligned or off-pattern relative to the baseline.

BASELINE (from stored WHOIS record):
{{BASELINE}}

CURRENT TEXT (what the human just said/wrote):
{{CURRENT_TEXT}}

TASK: Output a JSON object with exactly these fields:
- drift: boolean — true if the current text appears off-pattern relative to the baseline; false if aligned or inconclusive
- severity: "low" | "medium" | "high" — strength of mismatch when drift is true; use "low" when drift is false
- type: "tone" | "structure" | "emotional" | "mixed" — dominant mismatch type when drift is true; use "tone" when drift is false
- confidence: number 0–1 — how confident you are in the assessment (be conservative; prefer lower when uncertain)
- summary: string — one short sentence explaining the assessment, no medical or diagnostic claims

Output valid JSON only. No prose, no markdown, no comments.`;

type DriftSeverity = "low" | "medium" | "high";
type DriftType = "tone" | "structure" | "emotional" | "mixed";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function parseDriftResponse(raw: unknown): {
  drift: boolean;
  severity: DriftSeverity;
  type: DriftType;
  confidence: number;
  summary: string;
} {
  if (!isPlainObject(raw)) {
    throw new Error("Invalid drift response: not an object");
  }
  const drift = raw.drift === true;
  const severity = ["low", "medium", "high"].includes(String(raw.severity))
    ? (raw.severity as DriftSeverity)
    : "low";
  const type = ["tone", "structure", "emotional", "mixed"].includes(
    String(raw.type)
  )
    ? (raw.type as DriftType)
    : "tone";
  const conf = typeof raw.confidence === "number" ? raw.confidence : 0;
  const confidence = Math.max(0, Math.min(1, conf));
  const summary =
    typeof raw.summary === "string" && raw.summary.trim()
      ? raw.summary.trim().slice(0, 500)
      : "Baseline comparison completed.";
  return {
    drift,
    severity: drift ? severity : "low",
    type,
    confidence,
    summary,
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/agent/drift-check" });

  const kill = killSwitchResponse();
  if (kill) return kill;

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
  const currentText =
    typeof body.currentText === "string" ? body.currentText.trim() : "";

  if (!reportId) {
    return NextResponse.json(
      { error: "MISSING_REPORT_ID", message: "reportId is required" },
      { status: 400 }
    );
  }
  if (!currentText) {
    return NextResponse.json(
      { error: "MISSING_CURRENT_TEXT", message: "currentText is required" },
      { status: 400 }
    );
  }

  const entitlement = await getAgentEntitlementByToken(token);
  if (!entitlement) {
    return NextResponse.json(
      { error: "INVALID_TOKEN", reportId },
      { status: 403 }
    );
  }
  if (entitlement.status !== "active" || entitlement.reportId !== reportId) {
    return NextResponse.json(
      { error: "TOKEN_NOT_AUTHORIZED", reportId },
      { status: 403 }
    );
  }

  const origin =
    process.env.VERCEL_URL != null
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin;
  const whoisUrl = `${origin}/api/agent/whois?reportId=${encodeURIComponent(reportId)}`;

  let whoisPayload: Record<string, unknown>;
  try {
    const whoisRes = await fetch(whoisUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!whoisRes.ok) {
      const err = await whoisRes.json().catch(() => ({}));
      const code = (err as { error?: string }).error ?? "WHOIS_FETCH_FAILED";
      log("error", "drift_check_whois_failed", {
        requestId,
        reportId,
        status: whoisRes.status,
        error: code,
      });
      return NextResponse.json(
        {
          error: code,
          message: "Could not load WHOIS baseline",
          reportId,
        },
        { status: whoisRes.status === 404 ? 404 : 502 }
      );
    }
    whoisPayload = (await whoisRes.json()) as Record<string, unknown>;
    log("info", "drift_check_baseline_loaded", { requestId, reportId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("error", "drift_check_whois_error", { requestId, reportId, message: msg });
    return NextResponse.json(
      { error: "BASELINE_LOAD_FAILED", message: msg, reportId },
      { status: 502 }
    );
  }

  const ag = whoisPayload.agent_guidance as Record<string, unknown> | undefined;
  const as = whoisPayload.agent_summary as Record<string, unknown> | undefined;
  const storedReport = await getReport(reportId);
  const emotionalSnippet = storedReport?.emotional_snippet ?? "";

  const baselineParts: string[] = [];
  if (ag) {
    if (ag.support_style) baselineParts.push(`Support style: ${ag.support_style}`);
    if (Array.isArray(ag.agent_do) && ag.agent_do.length)
      baselineParts.push(`Agent do: ${(ag.agent_do as string[]).join("; ")}`);
    if (Array.isArray(ag.agent_avoid) && ag.agent_avoid.length)
      baselineParts.push(
        `Agent avoid: ${(ag.agent_avoid as string[]).join("; ")}`
      );
    if (Array.isArray(ag.likely_friction_patterns) && ag.likely_friction_patterns.length)
      baselineParts.push(
        `Likely friction: ${(ag.likely_friction_patterns as string[]).join("; ")}`
      );
  }
  if (as) {
    if (as.one_line) baselineParts.push(`One-line: ${as.one_line}`);
    if (as.help_strategy) baselineParts.push(`Help strategy: ${as.help_strategy}`);
    if (as.failure_mode) baselineParts.push(`Failure mode: ${as.failure_mode}`);
  }
  if (emotionalSnippet) {
    baselineParts.push(`Stored emotional snippet: ${emotionalSnippet}`);
  }

  const baseline = baselineParts.length
    ? baselineParts.join("\n")
    : "No structured baseline available.";

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    log("warn", "OPENAI_API_KEY not set for drift-check", { requestId });
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY_NOT_SET",
        message:
          "Set OPENAI_API_KEY in environment for drift analysis. Drift check requires a live LLM call.",
        reportId,
      },
      { status: 503 }
    );
  }

  const prompt = DRIFT_PROMPT.replace("{{BASELINE}}", baseline).replace(
    "{{CURRENT_TEXT}}",
    currentText.slice(0, 4000)
  );

  let rawOutput: string;
  try {
    const openai = new OpenAI({ apiKey });
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Output valid JSON only. No prose, no markdown, no comments. Use exactly the structure requested.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 512,
    });
    rawOutput = res.choices[0]?.message?.content?.trim() ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("error", "drift_check_llm_failed", { requestId, reportId, message: msg });
    return NextResponse.json(
      { error: "DRIFT_ANALYSIS_FAILED", message: msg, reportId },
      { status: 500 }
    );
  }

  if (!rawOutput) {
    return NextResponse.json(
      {
        error: "DRIFT_ANALYSIS_EMPTY",
        message: "No analysis returned from model",
        reportId,
      },
      { status: 500 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawOutput);
  } catch {
    log("error", "drift_check_invalid_json", {
      requestId,
      reportId,
      outputPreview: rawOutput.slice(0, 200),
    });
    return NextResponse.json(
      {
        error: "DRIFT_ANALYSIS_INVALID",
        message: "Invalid analysis format",
        reportId,
      },
      { status: 500 }
    );
  }

  let result: {
    drift: boolean;
    severity: DriftSeverity;
    type: DriftType;
    confidence: number;
    summary: string;
  };
  try {
    result = parseDriftResponse(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("error", "drift_check_parse_failed", { requestId, reportId, message: msg });
    return NextResponse.json(
      { error: "DRIFT_ANALYSIS_INVALID", message: msg, reportId },
      { status: 500 }
    );
  }

  log("info", "drift_check_complete", {
    requestId,
    reportId,
    drift: result.drift,
    severity: result.severity,
  });

  return NextResponse.json({
    drift: result.drift,
    severity: result.severity,
    type: result.type,
    confidence: result.confidence,
    summary: result.summary,
  });
}
