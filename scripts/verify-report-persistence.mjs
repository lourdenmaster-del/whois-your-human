#!/usr/bin/env node
/**
 * Verifies report persistence end-to-end: engine writes, then GET /api/report/{id} reads.
 * Run with dev server up. Uses dryRun so no OpenAI key required.
 *
 * Usage: node scripts/verify-report-persistence.mjs [baseUrl]
 *   baseUrl defaults to http://127.0.0.1:3000
 *
 * Curl equivalent (run after generation to confirm read path):
 *   # 1) Generate (dry run), capture reportId from response
 *   curl -s -X POST http://127.0.0.1:3000/api/engine/generate \
 *     -H "Content-Type: application/json" \
 *     -d '{"fullName":"Test","birthDate":"1990-01-15","birthTime":"14:30","birthLocation":"NY","email":"t@t.com","dryRun":true}' \
 *     | jq -r '.data.reportId'
 *   # 2) Read report by that ID (replace REPORT_ID with value from step 1)
 *   curl -s "http://127.0.0.1:3000/api/report/REPORT_ID" | jq .
 */

const base = process.argv[2] || "http://127.0.0.1:3000";

async function main() {
  console.log("Verify report persistence (engine write → GET /api/report/{id} read)");
  console.log("Base URL:", base);

  const res = await fetch(`${base}/api/engine/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Verify Persistence",
      birthDate: "1990-01-15",
      birthTime: "14:30",
      birthLocation: "New York, NY",
      email: "verify@example.com",
      dryRun: true,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("FAIL: POST /api/engine/generate returned", res.status, body);
    process.exit(1);
  }
  if (body.status !== "ok" || !body.data?.reportId) {
    console.error("FAIL: response missing status:ok or data.reportId", body);
    process.exit(1);
  }

  const reportId = body.data.reportId;
  console.log("OK: generated reportId", reportId);

  const getRes = await fetch(`${base}/api/report/${reportId}`);
  const getBody = await getRes.json().catch(() => ({}));
  if (!getRes.ok) {
    console.error("FAIL: GET /api/report/" + reportId, "returned", getRes.status, getBody);
    process.exit(1);
  }
  if (getBody.status !== "ok" || !getBody.data?.full_report) {
    console.error("FAIL: read path missing full_report", getBody);
    process.exit(1);
  }

  console.log("OK: GET /api/report/" + reportId, "→ full_report present, length", getBody.data.full_report?.length ?? 0);
  console.log("\nPersistence verified: stored reportId matches read path.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  if (err.cause?.code === "ECONNREFUSED") {
    console.error("Start the dev server first: npm run dev");
  }
  process.exit(1);
});
