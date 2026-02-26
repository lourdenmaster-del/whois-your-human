/**
 * Preflight checks for live Beauty pipeline.
 * Dev-only. Validates env vars and runtime mode before a single live test run.
 *
 * LIVE MODE CHECKLIST (env vars and flags):
 * - DRY_RUN: unset or "0" (must NOT be "1" or "true")
 * - OPENAI_API_KEY: set and non-empty
 * - BLOB_READ_WRITE_TOKEN: set and non-empty
 * - ALLOW_EXTERNAL_WRITES_IN_DEV: "1" when NODE_ENV=development (required for Blob/OpenAI writes in dev)
 * - NODE_ENV: "production" OR ALLOW_EXTERNAL_WRITES_IN_DEV=1
 */

import { allowExternalWrites, isDryRun } from "./runtime-mode";

export type PreflightResult = {
  ok: boolean;
  checks: {
    nodeEnv: string;
    openaiApiKey: boolean;
    blobToken: boolean;
    dryRunEnv: boolean;
    allowExternalWrites: boolean;
    summary: string;
  };
  checklist?: string[];
};

/**
 * Run preflight. Returns PASS/FAIL with reasons.
 * Call from server only (uses process.env).
 */
export function runPreflight(): PreflightResult {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const openaiApiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  const blobToken = Boolean(
    process.env.BLOB_READ_WRITE_TOKEN &&
      String(process.env.BLOB_READ_WRITE_TOKEN).length > 0
  );
  const dryRunEnv = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const allowWrites = allowExternalWrites;
  const isDry = isDryRun;

  const dryRunOk = !dryRunEnv;
  const rehearsalMode = dryRunEnv;
  const allOk = rehearsalMode
    ? blobToken
    : openaiApiKey && blobToken && dryRunOk && allowWrites && !isDry;

  let summary: string;
  if (allOk) {
    summary = rehearsalMode ? "PASS — Rehearsal mode (DRY_RUN=1), zero spend." : "PASS — Ready for live run.";
  } else {
    const reasons: string[] = [];
    if (!openaiApiKey) reasons.push("OPENAI_API_KEY missing");
    if (!blobToken) reasons.push("BLOB_READ_WRITE_TOKEN missing");
    if (!rehearsalMode && dryRunEnv) reasons.push("DRY_RUN=1 (must be unset or 0 for live)");
    if (!rehearsalMode && !allowWrites) reasons.push("allowExternalWrites=false (set ALLOW_EXTERNAL_WRITES_IN_DEV=1 in dev)");
    if (!rehearsalMode && isDry && !dryRunEnv) reasons.push("isDryRun true (check blob/openai)");
    summary = `FAIL — ${reasons.join("; ")}`;
  }

  return {
    ok: allOk,
    checks: {
      nodeEnv,
      openaiApiKey,
      blobToken,
      dryRunEnv,
      allowExternalWrites: allowWrites,
      summary,
    },
    checklist: [
      "DRY_RUN: unset or 0 (must NOT be 1)",
      "OPENAI_API_KEY: set",
      "BLOB_READ_WRITE_TOKEN: set",
      "ALLOW_EXTERNAL_WRITES_IN_DEV=1 (when NODE_ENV=development)",
    ],
  };
}
