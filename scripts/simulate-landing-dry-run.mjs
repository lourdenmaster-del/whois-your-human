#!/usr/bin/env node
/**
 * Simulate Landing Page form submission — DRY_RUN mode (offline).
 * Replicates engine/generate + beauty/dry-run logic without HTTP.
 * No real Stripe, no real OpenAI.
 */

const { randomUUID } = await import("crypto");

const BIRTH_DATA = {
  fullName: "Leonardo da Vinci",
  birthDate: "1452-04-15",
  birthTime: "03:30",
  birthLocation: "Vinci, Tuscany, Italy",
  email: "test@example.com",
};

// Replicate engine/generate DRY_RUN output
function mockEngineGenerate() {
  const reportId = randomUUID();
  const emotionalSnippet = `[DRY RUN] Light signature for ${BIRTH_DATA.fullName} at ${BIRTH_DATA.birthLocation}: a structural pattern formed by forces at initialization.`;
  const imagePrompts = [
    `Abstract light field, structural grid, deep navy #050814 with violet #7A4FFF accents, scientific-mythic portal, no figures.`,
    `Cosmic identity architecture, infrared red #FF3B3B and ultraviolet violet #7A4FFF, spectral imprint, 50-80 words.`,
  ];
  const fullReport = `[DRY RUN] Full report placeholder for ${BIRTH_DATA.fullName}

Initiation: forces at ${BIRTH_DATA.birthDate} ${BIRTH_DATA.birthTime || "—"} in ${BIRTH_DATA.birthLocation}.

Spectral Origin, Temporal Encoding, Gravitational Patterning, Directional Field, Archetype Revelation, Archetype Micro-Profiles, Behavioral Expression, Relational Field, Environmental Resonance, Cosmology Overlay, Identity Field Equation, Legacy Trajectory, Integration.

RAW SIGNAL | CUSTODIAN | ORACLE — three voices in every section.
Light vectors, spectral gradients, gravitational harmonics, temporal flux, cosmic-local interference.
Archetypes: Ignispectrum, Stabiliora, Duplicaris, Tenebris, Radianis, Precisura, Aequilibris, Obscurion, Vectoris, Structoris, Innovaris, Fluxionis.

(Set DRY_RUN=0 or remove the env var to generate real reports.)`;

  const vectorZero = {
    coherence_score: 0.85,
    primary_wavelength: "580–620 nm",
    secondary_wavelength: "450–480 nm",
    symmetry_profile: { lateral: 0.7, vertical: 0.75, depth: 0.7 },
    beauty_baseline: {
      color_family: "warm-neutral",
      texture_bias: "smooth",
      shape_bias: "balanced",
      motion_bias: "steady",
    },
    three_voice: {
      raw_signal: "Baseline field: spectral gradient stable; symmetry axes within nominal range.",
      custodian: "Vector Zero is the baseline coherence state.",
      oracle: "The baseline state is the identity at rest.",
    },
  };

  return {
    reportId,
    full_report: fullReport,
    emotional_snippet: emotionalSnippet,
    image_prompts: imagePrompts,
    vector_zero: vectorZero,
  };
}

// Replicate beauty/dry-run output
function mockBeautyDryRun(engineData) {
  const PLACEHOLDER_IMAGE =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";
  const imageryPrompts = [PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE];
  const checkoutUrl = `http://localhost:3000/beauty/success?reportId=${encodeURIComponent(engineData.reportId)}`;

  return {
    reportId: engineData.reportId,
    beautyProfile: {
      report: engineData.full_report || "[DRY_RUN] Report generated successfully.",
      image: PLACEHOLDER_IMAGE,
      emotionalSnippet: engineData.emotional_snippet || "",
      imageryPrompts,
    },
    checkout: { url: checkoutUrl },
  };
}

async function run() {
  console.log("=== LIGS Landing Page Dry-Run Simulation ===\n");
  console.log("Mode: Offline (mock data — no HTTP, no OpenAI)\n");
  console.log("Birth data:", JSON.stringify(BIRTH_DATA, null, 2));
  console.log("");

  // Step 1: Engine generate (DRY_RUN)
  console.log("1. Engine generate (dryRun: true)");
  const engineData = mockEngineGenerate();
  console.log("   reportId:", engineData.reportId);
  console.log(
    "   emotional_snippet:",
    engineData.emotional_snippet ? `${engineData.emotional_snippet.slice(0, 60)}…` : "(empty)"
  );
  console.log("   image_prompts:", engineData.image_prompts?.length ?? 0);
  console.log("   vector_zero: yes");
  console.log("");

  // Step 2: Beauty dry-run (PayUnlockButton)
  console.log("2. Beauty dry-run (PayUnlockButton simulation)");
  const dryRunData = mockBeautyDryRun(engineData);
  const beautyProfile = dryRunData.beautyProfile;
  console.log("   beautyProfile.report: yes");
  console.log("   beautyProfile.image: yes");
  console.log("   imageryPrompts:", beautyProfile.imageryPrompts?.length ?? 0);
  console.log("   checkout.url:", dryRunData.checkout?.url ?? "(none)");
  console.log("");

  // Full Landing Page Preview
  console.log("=== Full Landing Page Preview ===\n");
  console.log("--- Emotional Snippet ---");
  console.log(engineData.emotional_snippet || "(empty)");
  console.log("");
  console.log("--- Image Carousel (placeholders) ---");
  const slides = beautyProfile.imageryPrompts ?? (beautyProfile.image ? [beautyProfile.image] : []);
  slides.forEach((s, i) => {
    console.log(
      `  Slide ${i + 1}: ${typeof s === "string" && s.startsWith("data:") ? "[placeholder image]" : String(s).slice(0, 50) + "…"}`
    );
  });
  console.log("");
  console.log("--- Full Report JSON ---");
  const reportPayload = {
    reportId: engineData.reportId,
    full_report: engineData.full_report,
    emotional_snippet: engineData.emotional_snippet,
    image_prompts: engineData.image_prompts,
    vector_zero: engineData.vector_zero,
  };
  console.log(JSON.stringify(reportPayload, null, 2));
  console.log("");
  console.log("--- Beauty Profile (PayUnlockButton preview) ---");
  console.log(JSON.stringify(dryRunData, null, 2));
  console.log("");
  console.log("--- Verification: PayUnlockButton preview mode ---");
  const hasReport = !!beautyProfile.report;
  const hasImage = !!beautyProfile.image;
  const hasPrompts = !!(beautyProfile.imageryPrompts?.length);
  const previewValid = hasReport && (hasImage || hasPrompts);
  console.log("  beautyProfile.report present:", hasReport ? "✓" : "✗");
  console.log("  beautyProfile.image or imageryPrompts:", hasImage || hasPrompts ? "✓" : "✗");
  console.log("  PayUnlockButton would open preview:", previewValid ? "✓ YES" : "✗ NO");
  console.log("  Proceed would redirect to:", dryRunData.checkout?.url || "/beauty/success");
  console.log("");
  console.log("=== Simulation complete ===");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
