#!/usr/bin/env node
/**
 * Simulate Beauty landing page (/beauty) in DRY_RUN mode.
 *
 * Renders an HTML snapshot with mock preview reports, images, and emotional snippets.
 * No dev server, no network, no OpenAI, no Stripe.
 *
 * Usage:
 *   node scripts/simulate-beauty-landing.mjs              # JSON to stdout
 *   node scripts/simulate-beauty-landing.mjs --write-html # also write to /tmp/beauty-dry-run.html
 *   npm run simulate:beauty
 *
 * Output: JSON with { renderedPage, previewCards, simulatedEvents, layoutSections }
 */

const { randomUUID } = await import("crypto");
const { writeFileSync } = await import("fs");

const DRY_RUN_DEFAULT = true;
const args = process.argv.slice(2);
const dryRun = args.includes("--dryRun=false") ? false : DRY_RUN_DEFAULT;
const writeHtml = args.includes("--write-html");

// Mock preview cards (matches /api/report/previews fallback)
const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230A0F1C' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%237A4FFF' font-size='14' text-anchor='middle' dy='.3em'%3ELight Signature%3C/text%3E%3C/svg%3E";

const MOCK_PREVIEW_CARDS = [
  {
    reportId: "preview-1",
    subjectName: "Anonymous",
    emotionalSnippet:
      "A resonance between structure and expression — the Light Signature reveals coherence where pattern meets possibility.",
    imageUrls: [PLACEHOLDER_SVG, PLACEHOLDER_SVG, PLACEHOLDER_SVG],
  },
  {
    reportId: "preview-2",
    subjectName: "Anonymous",
    emotionalSnippet:
      "The forces that shape identity imprint a unique pattern at initialization — a baseline that endures.",
    imageUrls: [PLACEHOLDER_SVG, PLACEHOLDER_SVG, PLACEHOLDER_SVG],
  },
  {
    reportId: "preview-3",
    subjectName: "Anonymous",
    emotionalSnippet:
      "Spectral gradients, structural grids — the aesthetic field maps the invisible forces that define who you become.",
    imageUrls: [PLACEHOLDER_SVG, PLACEHOLDER_SVG, PLACEHOLDER_SVG],
  },
];

// Mock form + result data (dry run)
const DRY_RUN_FORM_DATA = {
  name: "Dev User",
  birthDate: "1990-01-15",
  birthTime: "14:30",
  birthLocation: "New York, NY",
  email: "dev@example.com",
};

const PLACEHOLDER_SNIPPET =
  "A sample emotional resonance from your Light Signature — coherence between inner structure and outer expression.";
const PLACEHOLDER_PROMPTS = [
  "Serene landscape with dawn light and soft gradients",
  "Abstract form suggesting wholeness and integration",
  "Organic shapes evoking natural harmony",
];

const REPORT_ID = dryRun ? "dry-run-preview" : randomUUID();

const DUMMY_CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_xxx";

function escapeHtml(s) {
  if (s == null || typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlSnapshot() {
  const snippet = escapeHtml(PLACEHOLDER_SNIPPET);
  const fullReport = escapeHtml(
    "[DRY RUN] Placeholder report for layout verification. Submit the form for a real report."
  );

  const imagePromptsHtml = PLACEHOLDER_PROMPTS.map(
    (p, i) =>
      `<div style="border: 1px solid #e8e4e8; padding: 1rem; margin: 0.5rem 0;"><p>[Image ${i + 1}] — ${escapeHtml(String(p).slice(0, 100))}${String(p).length > 100 ? "…" : ""}</p></div>`
  ).join("");

  const previewCardsHtml = MOCK_PREVIEW_CARDS.map(
    (card) => `
    <article class="preview-card" data-report-id="${escapeHtml(card.reportId)}">
      <div class="card-carousel">
        <img src="${escapeHtml(card.imageUrls[0] || PLACEHOLDER_SVG)}" alt="" />
      </div>
      <p class="emotional-snippet">"${escapeHtml(card.emotionalSnippet)}"</p>
    </article>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Beauty — LIGS DRY_RUN Simulation</title>
  <style>.italic{font-style:italic}.muted{opacity:.7}.pay-button{background:#7A4FFF;color:#fff;padding:.5rem 1.5rem;border:none;cursor:pointer}.reset-link{background:transparent;border:none;text-decoration:underline;cursor:pointer}</style>
</head>
<body class="beauty-theme" style="font-family: Georgia, serif; background: #fdf8f5; color: #0d0b10;">
  <main class="beauty-page" style="max-width: 64rem; margin: 0 auto; padding: 2rem;">
    <!-- Hero -->
    <section class="hero" style="min-height: 60vh; display: flex; flex-direction: column; justify-content: center; text-align: center;">
      <h1 style="font-size: 2.5rem; letter-spacing: 0.02em;"><a href="https://ligs.io">(L)igs</a></h1>
      <p>A new scientific field for understanding how physical forces shape identity.</p>
      <p>LIGS reveals that pattern. The Light Identity Report interprets it.</p>
      <a href="#section-5">Begin your Light Identity Report →</a>
    </section>

    <!-- What is LIGS -->
    <section class="section"><h2>What is LIGS?</h2><p>LIGS is a scientific framework that studies how forces shape identity.</p></section>

    <!-- Why it matters -->
    <section class="section"><h2>Why it matters</h2><p>Most systems describe who you are after the fact. LIGS identifies the structure beneath it.</p></section>

    <!-- How it works -->
    <section class="section"><h2>How it works</h2><p>LIGS analyzes the full environment of forces present at the moment your biology initializes.</p></section>

    <!-- Form -->
    <section id="section-5" class="section">
      <h2>Begin your Light Identity Report</h2>
      <form class="mock-form">
        <input name="name" value="${escapeHtml(DRY_RUN_FORM_DATA.name)}" placeholder="Name"/>
        <input name="birthDate" value="${escapeHtml(DRY_RUN_FORM_DATA.birthDate)}" placeholder="Birth date"/>
        <input name="birthTime" value="${escapeHtml(DRY_RUN_FORM_DATA.birthTime)}" placeholder="Birth time"/>
        <input name="birthLocation" value="${escapeHtml(DRY_RUN_FORM_DATA.birthLocation)}" placeholder="Location"/>
        <input name="email" value="${escapeHtml(DRY_RUN_FORM_DATA.email)}" placeholder="Email"/>
        <button type="submit">Generate My Light Identity Report</button>
      </form>
      <div class="output-summary">
        <p><strong>Latest report:</strong> <code>${escapeHtml(REPORT_ID)}</code> — "${escapeHtml(snippet.slice(0, 80))}…" · Image prompts: ${PLACEHOLDER_PROMPTS.length}</p>
      </div>
    </section>

    <!-- Results -->
    <section id="report" class="section">
      <h2>Your Light Identity — Preview</h2>
      <div class="summary-box"><p class="italic">${snippet}</p></div>
      <div class="imagery-prompts">${imagePromptsHtml}</div>
      <div class="full-report-box"><pre>${fullReport}</pre></div>
      <p class="muted">Unlock your full Light Identity Report. Pay with Stripe to receive the complete report via email.</p>
      <button class="pay-button">Proceed to Checkout</button>
      <p class="test-mode-badge">Stripe test mode — no real charges</p>
      <button class="reset-link">Generate another report</button>
    </section>

    <!-- Preview Cards (LandingPreviews) -->
    <section class="section">
      <h2>Previous Light Identity Reports</h2>
      <div class="preview-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
        ${previewCardsHtml}
      </div>
    </section>

    <!-- Footer -->
    <footer class="section">
      <a href="https://ligs.io">LIGS — Light Identity System</a>
      <p>A scientific identity framework · <a href="https://ligs.io">ligs.io</a></p>
    </footer>
  </main>
</body>
</html>`;
}

function simulateUserActions() {
  const events = [];
  events.push("1. Fill form — lastFormData saved in-memory");
  events.push("2. Open preview card modal → carousel (Vector Zero, Light Signature, Final Beauty), view emotional snippet");
  events.push("3. Click PayUnlockButton → (simulated) redirect to " + DUMMY_CHECKOUT_URL);
  events.push("4. Click 'Generate another report' → clear form and previews, reset formKey");
  return events;
}

function run() {
  const renderedPage = buildHtmlSnapshot();
  const previewCards = [...MOCK_PREVIEW_CARDS];

  const output = {
    dryRun,
    renderedPage,
    previewCards,
    simulatedEvents: simulateUserActions(),
    layoutSections: [
      "Hero",
      "What is LIGS",
      "Why it matters",
      "How it works",
      "Form",
      "Results",
      "Preview cards",
      "PayUnlockButton",
      "Footer",
    ],
  };

  // Optional: write HTML to file for visual inspection
  if (writeHtml) {
    const outPath = "/tmp/beauty-dry-run.html";
    writeFileSync(outPath, renderedPage, "utf8");
    output.htmlFile = outPath;
  }

  // Output JSON to stdout
  console.log(JSON.stringify(output, null, 2));
}

run();
