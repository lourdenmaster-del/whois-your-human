#!/usr/bin/env node
/**
 * Verify WHOIS agent flow end-to-end (without Stripe).
 * Requires: dev server running, BLOB_READ_WRITE_TOKEN set.
 * Usage: node scripts/verify-agent-flow.mjs [BASE_URL]
 * Example: node scripts/verify-agent-flow.mjs http://localhost:3000
 */

const BASE = process.argv[2] || "http://localhost:3000";

const BIRTH_DATA = {
  fullName: "Agent Flow Verify",
  birthDate: "1990-01-15",
  birthTime: "14:30",
  birthLocation: "New York, NY",
  email: "agent-verify@example.com",
};

async function main() {
  console.log("Verifying WHOIS agent flow at", BASE);
  console.log("");

  // 1. Dry-run to get reportId
  const dryRes = await fetch(`${BASE}/api/beauty/dry-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ birthData: BIRTH_DATA, dryRun: true }),
  });
  const dryData = await dryRes.json().catch(() => ({}));
  const payload = dryData.data ?? dryData;
  const reportId = payload.reportId;

  if (!dryRes.ok || !reportId) {
    console.error("1. dry-run FAILED:", dryRes.status, dryData.error || dryData);
    process.exit(1);
  }
  console.log("1. dry-run OK — reportId:", reportId);

  // 2. Mint agent token (dev-only)
  const mintRes = await fetch(`${BASE}/api/dev/mint-agent-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId }),
  });
  const mintData = await mintRes.json().catch(() => ({}));
  const token = mintData.token;

  if (!mintRes.ok || !token) {
    console.error("2. mint-agent-token FAILED:", mintRes.status, mintData);
    process.exit(1);
  }
  console.log("2. mint-agent-token OK — token:", token.slice(0, 16) + "...");

  // 3. GET /api/agent/whois
  const whoisRes1 = await fetch(
    `${BASE}/api/agent/whois?reportId=${encodeURIComponent(reportId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const whois1 = await whoisRes1.json().catch(() => ({}));

  if (!whoisRes1.ok) {
    console.error("3. GET whois FAILED:", whoisRes1.status, whois1);
    process.exit(1);
  }
  const hasLastFeedback1 = !!whois1.verification?.last_feedback;
  console.log("3. GET whois OK — last_feedback:", hasLastFeedback1 ? "present" : "absent");

  // 4. POST /api/agent/feedback
  const feedbackRes = await fetch(`${BASE}/api/agent/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      reportId,
      state: "confirmed",
      metrics: { test: true },
    }),
  });
  const feedbackData = await feedbackRes.json().catch(() => ({}));

  if (!feedbackRes.ok) {
    console.error("4. POST feedback FAILED:", feedbackRes.status, feedbackData);
    process.exit(1);
  }
  console.log("4. POST feedback OK — state: confirmed");

  // 5. GET /api/agent/whois again — verify feedback reflected
  const whoisRes2 = await fetch(
    `${BASE}/api/agent/whois?reportId=${encodeURIComponent(reportId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const whois2 = await whoisRes2.json().catch(() => ({}));

  if (!whoisRes2.ok) {
    console.error("5. GET whois (after feedback) FAILED:", whoisRes2.status, whois2);
    process.exit(1);
  }
  const lastFeedback = whois2.verification?.last_feedback;
  const observedMatch = whois2.verification?.observed_match_fields ?? [];
  const hasReflection = lastFeedback?.state === "confirmed" && observedMatch.length > 0;
  console.log("5. GET whois (after feedback) OK — last_feedback:", lastFeedback?.state ?? "—");
  console.log("   observed_match_fields:", observedMatch.length, "items");
  if (!hasReflection) {
    console.warn("   WARN: feedback may not be reflected (Blob vs memory storage)");
  }

  // 6. POST /api/agent/drift-check (may fail without OPENAI_API_KEY)
  const driftRes = await fetch(`${BASE}/api/agent/drift-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      reportId,
      currentText: "I need two clear options with tradeoffs before I can decide.",
    }),
  });
  const driftData = await driftRes.json().catch(() => ({}));

  if (driftRes.ok) {
    console.log("6. POST drift-check OK — drift:", driftData.drift, "severity:", driftData.severity);
  } else {
    console.log("6. POST drift-check:", driftRes.status, driftData.error || driftData.message || "—");
    if (driftData.error === "OPENAI_API_KEY_NOT_SET") {
      console.log("   (Expected without OPENAI_API_KEY; drift-check requires LLM)");
    }
  }

  console.log("");
  console.log("Agent flow verification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
