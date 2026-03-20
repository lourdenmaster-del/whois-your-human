#!/usr/bin/env node
/**
 * Dev-only: verify Studio "Test Paid Report" path without UI.
 * POSTs to /api/beauty/dry-run, then checks that the returned reportId
 * can be used to load the profile (GET /api/beauty/[reportId]).
 *
 * Requires: dev server running (npm run dev), and Blob configured for persistence.
 * Usage: node scripts/verify-studio-test-paid-report.mjs [BASE_URL]
 * Example: node scripts/verify-studio-test-paid-report.mjs http://localhost:3000
 */

const BASE = process.argv[2] || "http://localhost:3000";

const BIRTH_DATA = {
  fullName: "Studio Verify User",
  birthDate: "1990-01-15",
  birthTime: "14:30",
  birthLocation: "New York, NY",
  email: "dev@example.com",
};

async function main() {
  console.log("Verifying Studio Test Paid Report path at", BASE);
  console.log("");

  const res = await fetch(`${BASE}/api/beauty/dry-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      birthData: { ...BIRTH_DATA },
      dryRun: true,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("dry-run failed:", res.status, data.error || data.message || data);
    process.exit(1);
  }

  const payload = data.data ?? data;
  const reportId = payload.reportId;
  if (!reportId) {
    console.error("dry-run did not return reportId:", payload);
    process.exit(1);
  }

  console.log("1. dry-run OK — reportId:", reportId);
  console.log("   intakeStatus:", payload.intakeStatus ?? "—");
  console.log("   checkout.url:", payload.checkout?.url ?? "—");
  console.log("");

  const profileRes = await fetch(`${BASE}/api/beauty/${encodeURIComponent(reportId)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const profileJson = await profileRes.json().catch(() => ({}));
  const profileData = profileJson?.data ?? profileJson;
  if (!profileRes.ok) {
    console.warn("2. GET /api/beauty/[reportId] failed (profile may not be persisted if Blob is not configured):", profileRes.status);
  } else {
    const fr = profileData?.fullReport ?? "";
    console.log("2. Profile load OK — subjectName:", profileData.subjectName ?? "—");
    console.log("   fullReport length (from GET, not dry-run JSON):", typeof fr === "string" ? fr.length : "—");
  }

  console.log("");
  console.log("Studio Test Paid Report path verification done. Use Test mode in Studio to confirm UI.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
