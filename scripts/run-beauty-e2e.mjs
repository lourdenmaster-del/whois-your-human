#!/usr/bin/env node
/**
 * Run end-to-end Beauty flow (non-DRY_RUN) and output the stored profile fields.
 * Fallback: use fixture filter_output if real generation fails (missing keys).
 *
 * Usage: DRY_RUN=0 node scripts/run-beauty-e2e.mjs [baseUrl]
 *   baseUrl defaults to http://127.0.0.1:3000
 *
 * Requires: npm run dev (server running)
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const baseUrl = process.argv[2] || process.env.BASE_URL || "http://127.0.0.1:3000";

function loadEnvLocal() {
  try {
    const path = join(root, ".env.local");
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch (_) {}
}
loadEnvLocal();

const TEST_BODY = {
  fullName: "Test User",
  birthDate: "1990-01-15",
  birthTime: "14:30",
  birthLocation: "New York, NY",
  email: "test@example.com",
  dryRun: false,
};

function formatOutput(profile) {
  const lines = [];
  lines.push("=== emotionalSnippet ===");
  lines.push(profile.emotionalSnippet ?? "(not set)");
  lines.push("");
  lines.push("=== vector_zero.three_voice ===");
  const v0 = profile.vector_zero?.three_voice ?? {};
  lines.push("raw_signal:", v0.raw_signal ?? "");
  lines.push("custodian:", v0.custodian ?? "");
  lines.push("oracle:", v0.oracle ?? "");
  lines.push("");
  lines.push("=== light_signature ===");
  const ls = profile.light_signature ?? {};
  lines.push("raw_signal:", ls.raw_signal ?? "");
  lines.push("custodian:", ls.custodian ?? "");
  lines.push("oracle:", ls.oracle ?? "");
  lines.push("");
  lines.push("=== archetype ===");
  const arch = profile.archetype ?? {};
  lines.push("raw_signal:", arch.raw_signal ?? "");
  lines.push("custodian:", arch.custodian ?? "");
  lines.push("oracle:", arch.oracle ?? "");
  lines.push("");
  lines.push("=== deviations ===");
  const dev = profile.deviations ?? {};
  lines.push("raw_signal:", dev.raw_signal ?? "");
  lines.push("custodian:", dev.custodian ?? "");
  lines.push("oracle:", dev.oracle ?? "");
  lines.push("");
  lines.push("=== corrective_vector ===");
  const cv = profile.corrective_vector ?? {};
  lines.push("raw_signal:", cv.raw_signal ?? "");
  lines.push("custodian:", cv.custodian ?? "");
  lines.push("oracle:", cv.oracle ?? "");
  lines.push("");
  lines.push("=== imagery_prompts ===");
  const ip = profile.imagery_prompts ?? {};
  lines.push("vector_zero_beauty_field:", ip.vector_zero_beauty_field ?? "");
  lines.push("light_signature_aesthetic_field:", ip.light_signature_aesthetic_field ?? "");
  lines.push("final_beauty_field:", ip.final_beauty_field ?? "");
  lines.push("");
  lines.push("=== fullReport ===");
  lines.push(profile.fullReport ?? "(not set)");
  return lines.join("\n");
}

async function runRealFlow() {
  const res = await fetch(`${baseUrl}/api/engine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(TEST_BODY),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = json?.error ?? json?.message ?? res.statusText;
    throw new Error(`${res.status}: ${err}`);
  }
  const data = json.data ?? json;
  if (!data.reportId) throw new Error("No reportId in response");
  // Fetch stored profile from Blob via beauty API
  const beautyRes = await fetch(`${baseUrl}/api/beauty/${data.reportId}`);
  if (!beautyRes.ok) {
    // Engine response may include the profile directly if we saved it
    if (data.emotionalSnippet !== undefined || data.light_signature) {
      return data;
    }
    throw new Error(`Beauty fetch failed: ${beautyRes.status}`);
  }
  const beauty = await beautyRes.json();
  return beauty.data ?? beauty;
}

function threeVoiceFrom(raw) {
  return {
    raw_signal: String(raw?.raw_signal ?? ""),
    custodian: String(raw?.custodian ?? ""),
    oracle: String(raw?.oracle ?? ""),
  };
}

const SECTION_BRIDGES = {
  "Light Signature": "How you shine when you're aligned.",
  Archetype: "Your core pattern and how it presents.",
  Deviations: "Where the pattern drifts under pressure.",
  "Corrective Vector": "How you return to center.",
};

const RADIANTIS_RESET_MOVES = [
  "step into sunlight, even for a minute",
  "tell one person one true thing",
  "open a window, let air in",
];

function buildCondensedFullReport(profile, archetypeName = "Radiantis") {
  const sections = [
    { title: "Light Signature", v: profile.light_signature },
    { title: "Archetype", v: profile.archetype },
    { title: "Deviations", v: profile.deviations },
    { title: "Corrective Vector", v: profile.corrective_vector },
  ];
  const blocks = sections.map(({ title, v }) => {
    const bridge = SECTION_BRIDGES[title] ?? "";
    const bridgeLine = bridge ? `${bridge}\n\n` : "";
    return `${title}\n${bridgeLine}Signal: ${v.raw_signal}\nGround: ${v.custodian}\nReflection: ${v.oracle}`;
  });
  const moves = [...new Set(RADIANTIS_RESET_MOVES)];
  const keyMoves = moves.length > 0 ? `\n\nKey Moves\n${moves.map((m) => `• ${m}`).join("\n")}` : "";
  return blocks.join("\n\n") + keyMoves;
}

async function runFixtureFallback() {
  const mockPath = join(root, "tests", "mocks", "full_report.json");
  const raw = readFileSync(mockPath, "utf-8");
  const mock = JSON.parse(raw);
  const fo = mock.filter_output;
  const v0 = mock.vector_zero;
  const v0Voices = fo?.vector_zero?.three_voice;
  const beautyBaseline = fo?.vector_zero?.beauty_baseline;
  const profile = {
    vector_zero: {
      three_voice: v0?.three_voice ? threeVoiceFrom(v0.three_voice) : threeVoiceFrom(v0Voices),
      beauty_baseline: {
        color_family: String(beautyBaseline?.color_family ?? ""),
        texture_bias: String(beautyBaseline?.texture_bias ?? ""),
        shape_bias: String(beautyBaseline?.shape_bias ?? ""),
        motion_bias: String(beautyBaseline?.motion_bias ?? ""),
      },
    },
    light_signature: threeVoiceFrom(fo?.light_signature),
    archetype: threeVoiceFrom(fo?.archetype),
    deviations: threeVoiceFrom(fo?.deviations),
    corrective_vector: threeVoiceFrom(fo?.corrective_vector),
    imagery_prompts: {
      vector_zero_beauty_field: String(fo?.imagery_prompts?.vector_zero_beauty_field ?? ""),
      light_signature_aesthetic_field: String(fo?.imagery_prompts?.light_signature_aesthetic_field ?? ""),
      final_beauty_field: String(fo?.imagery_prompts?.final_beauty_field ?? ""),
    },
  };
  return {
    emotionalSnippet: mock.emotional_snippet ?? "",
    vector_zero: profile.vector_zero,
    light_signature: profile.light_signature,
    archetype: profile.archetype,
    deviations: profile.deviations,
    corrective_vector: profile.corrective_vector,
    imagery_prompts: profile.imagery_prompts,
    fullReport: buildCondensedFullReport(profile),
  };
}

async function main() {
  if (process.env.DRY_RUN === "1") {
    console.error("DRY_RUN=1 is set. Unset it or set DRY_RUN=0 for real generation.");
    process.exit(1);
  }
  console.error("Running Beauty E2E (non-DRY_RUN)...");
  try {
    const profile = await runRealFlow();
    console.log(formatOutput(profile));
  } catch (err) {
    const msg = err.message ?? String(err);
    console.error("Real flow failed:", msg);

    if (msg.includes("OPENAI_API_KEY")) {
      console.error("\nMissing: OPENAI_API_KEY. Set in .env.local or environment.");
    }
    if (msg.includes("BEAUTY_PROFILE") || msg.includes("BLOB") || msg.includes("WRITE")) {
      console.error("\nMissing or invalid: BLOB_READ_WRITE_TOKEN. Required for saving Beauty profile to Blob.");
    }
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      console.error("\nDev server not running. Start with: npm run dev");
    }

    console.error("\n--- Fallback: E.V.E. extraction from fixture ---\n");
    try {
      const profile = await runFixtureFallback();
      console.log(formatOutput(profile));
    } catch (e) {
      console.error("Fixture fallback failed:", e.message);
      process.exit(1);
    }
  }
}

main();
