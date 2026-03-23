/**
 * Shared client for LIGS engine API. Used by both the main LIGS intake and the Beauty page.
 * The browser must never call OpenAI; all requests go through server API routes.
 * Canonical WHOIS flow uses /api/whois/submit and /api/whois/dry-run (delegate to /api/beauty/*).
 *
 * CANONICAL WHOIS FLOW
 * This file is part of the active WHOIS human→agent system.
 * Do not introduce beauty-named dependencies here.
 */

import { unwrapResponse } from "@/lib/unwrap-response";

const ENGINE_ENDPOINT = "/api/engine/generate";
const EVE_ENDPOINT = "/api/engine";
const WHOIS_SUBMIT_ENDPOINT = "/api/whois/submit";
const WHOIS_DRY_RUN_ENDPOINT = "/api/whois/dry-run";
const BEAUTY_PREPURCHASE_ENDPOINT = "/api/beauty/prepurchase";
const REQUEST_TIMEOUT_MS = 120000;
const EVE_TIMEOUT_MS = 180000;

function readStoredExecutionKey() {
  if (typeof window === "undefined") return undefined;
  try {
    const k = sessionStorage.getItem("ligs_execution_key");
    return k && k.trim() ? k.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Build API payload from form data (form field names -> API field names).
 * notes is optional and reserved for future use; the engine currently ignores it.
 * @param {Object} [options] - { dryRun?: boolean } to request dry-run for this call only.
 */
export function buildEnginePayload(formData, options = {}) {
  const payload = {
    fullName: formData.name,
    birthDate: formData.birthDate,
    birthTime: formData.birthTime ?? "",
    birthLocation: formData.birthLocation,
    email: formData.email,
    ...(formData.notes != null && formData.notes.trim() !== "" && { notes: formData.notes.trim() }),
  };
  if (options.dryRun === true) payload.dryRun = true;
  return payload;
}

/**
 * POST to /api/whois/dry-run. Saves report + WhoisProfileV1 to Blob (when configured).
 * Use when dryRun is true so previews and /beauty/view work locally for $0.
 * @returns {Promise<{ reportId: string, intakeStatus?: string, note?: string, checkout?: { url: string } }>}
 */
export async function submitToWhoisDryRun(formData) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(WHOIS_DRY_RUN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthData: buildEnginePayload(formData),
        dryRun: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await unwrapResponse(res);
    return { reportId: data.reportId, ...data };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * POST to /api/beauty/prepurchase. Saves form payload server-side before Stripe redirect.
 * Returns { draftId } for create-checkout-session metadata. Fails gracefully; caller falls back to localStorage.
 * @param {Object} formData - { name, birthDate, birthTime, birthLocation, email, notes? }
 * @returns {Promise<{ draftId: string } | null>}
 */
export async function prepurchaseBeautyDraft(formData) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(BEAUTY_PREPURCHASE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthData: buildEnginePayload(formData) }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await unwrapResponse(res);
    return { draftId: data.draftId };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

/**
 * POST to the engine API. Returns the response data on success, throws on error.
 * @param {Object} formData - { name, birthDate, birthTime, birthLocation, email, notes? }
 * @param {Object} [options] - { dryRun?: boolean } when true, request dry-run (no OpenAI calls).
 * @returns {Promise<{ reportId: string, emotional_snippet: string, image_prompts: string[], vector_zero?: object }>}
 */
export async function submitToEngine(formData, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const executionKey = options.executionKey ?? readStoredExecutionKey();
  try {
    const res = await fetch(ENGINE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildEnginePayload(formData, options),
        ...(executionKey && { executionKey }),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await unwrapResponse(res);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * POST to /api/whois/submit. Runs server-side derivation (deriveFromBirthData) then
 * forwards to the E.V.E. pipeline. Use this for the Beauty page so the derivation
 * pipeline always runs.
 * @param {Object} formData - { name, birthDate, birthTime, birthLocation, email, notes? }
 * @param {Object} [options] - { dryRun?: boolean }
 * @returns {Promise<{ reportId?: string, intakeStatus?: string, note?: string }>} Minimal client envelope; full engine/Beauty payload is server-only.
 */
export async function submitToWhoisSubmit(formData, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EVE_TIMEOUT_MS);
  const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined;
  const executionKey = options.executionKey ?? readStoredExecutionKey();
  try {
    const res = await fetch(WHOIS_SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildEnginePayload(formData, options),
        ...(idempotencyKey && { idempotencyKey }),
        ...(executionKey && { executionKey }),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await unwrapResponse(res);
    if (options.dryRun !== true) {
      try {
        sessionStorage.removeItem("ligs_execution_key");
      } catch {
        /* ignore */
      }
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * POST to the E.V.E. API (LIGS engine + Beauty filter). Prefer submitToWhoisSubmit
 * for the canonical flow so deriveFromBirthData always runs server-side.
 * @param {Object} formData - { name, birthDate, birthTime, birthLocation, email, notes? }
 * @returns {Promise<{ reportId?: string, vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts }>}
 */
export async function submitToEve(formData) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EVE_TIMEOUT_MS);
  const executionKey = readStoredExecutionKey();
  try {
    const res = await fetch(EVE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildEnginePayload(formData),
        ...(executionKey && { executionKey }),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await unwrapResponse(res);
  } finally {
    clearTimeout(timeoutId);
  }
}
