#!/usr/bin/env node
/**
 * Verify Landing Page & Beauty Flow Preview
 *
 * Run with dev server: PORT=3000 npm run dev
 * Then: node scripts/verify-beauty-flow.mjs [baseUrl]
 *
 * Default baseUrl: http://127.0.0.1:3000
 *
 * Tests:
 * 1. /beauty loads (200)
 * 2. /api/report/previews returns previewCards (mock when Blob empty)
 * 3. /api/beauty/dry-run returns reportId + beautyProfile
 * 4. /api/stripe/create-checkout-session returns 404 for dry-run reportId (no Beauty Profile)
 */

const BASE_URL = process.argv[2] ?? "http://127.0.0.1:3000";

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
  }
  return { res, json };
}

async function main() {
  console.log("=== LIGS Beauty Flow Verification ===\n");
  console.log("Base URL:", BASE_URL);
  console.log("");

  let passed = 0;
  let failed = 0;

  // 1. /beauty loads
  try {
    const res = await fetch(`${BASE_URL}/beauty`, { redirect: "manual" });
    if (res.ok || res.status === 307 || res.status === 308) {
      console.log("1. /beauty loads: ✓");
      passed++;
    } else {
      console.log("1. /beauty loads: ✗ (status", res.status + ")");
      failed++;
    }
  } catch (err) {
    console.log("1. /beauty loads: ✗", err.message);
    console.log("   Ensure dev server is running: PORT=3000 npm run dev");
    failed++;
  }

  // 2. /api/report/previews
  try {
    const { res, json } = await fetchJson(`${BASE_URL}/api/report/previews`);
    const cards = json?.data?.previewCards ?? json?.previewCards ?? [];
    if (res.ok && Array.isArray(cards) && cards.length >= 1) {
      console.log("2. /api/report/previews: ✓", cards.length, "cards");
      if (cards[0]) {
        const c = cards[0];
        console.log("   First card: reportId=" + (c.reportId ?? "(none)") + ", snippet=" + (c.emotionalSnippet ? "yes" : "no"));
      }
      passed++;
    } else {
      console.log("2. /api/report/previews: ✗ (no previewCards or non-200)");
      failed++;
    }
  } catch (err) {
    console.log("2. /api/report/previews: ✗", err.message);
    failed++;
  }

  // 3. /api/beauty/dry-run
  const birthData = {
    fullName: "Test User",
    birthDate: "1990-01-15",
    birthTime: "14:30",
    birthLocation: "New York, NY",
    email: "test@example.com",
  };
  let dryRunReportId = null;
  try {
    const { res, json } = await fetchJson(`${BASE_URL}/api/beauty/dry-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthData, dryRun: true }),
    });
    const data = json?.data ?? json;
    dryRunReportId = data?.reportId ?? null;
    const hasProfile = !!(data?.beautyProfile?.report && (data?.beautyProfile?.image || data?.beautyProfile?.imageryPrompts?.length));
    if (res.ok && dryRunReportId && hasProfile) {
      console.log("3. /api/beauty/dry-run: ✓ reportId=" + dryRunReportId);
      passed++;
    } else {
      console.log("3. /api/beauty/dry-run: ✗ (missing reportId or beautyProfile)");
      if (json?.error) console.log("   Error:", json.error);
      failed++;
    }
  } catch (err) {
    console.log("3. /api/beauty/dry-run: ✗", err.message);
    failed++;
  }

  // 4. /api/stripe/create-checkout-session (expect 404 for dry-run reportId)
  if (dryRunReportId) {
    try {
      const { res, json } = await fetchJson(`${BASE_URL}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: dryRunReportId }),
      });
      const code = json?.code ?? "";
      if (res.status === 404 && (code === "BEAUTY_PROFILE_NOT_FOUND" || json?.error)) {
        console.log("4. Stripe checkout (dry-run reportId): ✓ returns 404 BEAUTY_PROFILE_NOT_FOUND (expected)");
        passed++;
      } else if (res.ok && json?.data?.url) {
        console.log("4. Stripe checkout: ✓ returns URL (Beauty Profile exists)");
        passed++;
      } else {
        console.log("4. Stripe checkout: ✗ unexpected status", res.status, "code=" + code);
        failed++;
      }
    } catch (err) {
      console.log("4. Stripe checkout: ✗", err.message);
      failed++;
    }
  } else {
    console.log("4. Stripe checkout: skipped (no dry-run reportId)");
  }

  console.log("");
  console.log("Result:", passed, "passed,", failed, "failed");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
