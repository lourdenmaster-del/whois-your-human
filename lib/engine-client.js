/**
 * Shared client for LIGS engine API. Used by both the main LIGS intake and the Beauty page.
 * Same request shape and payload structure; no duplicated logic.
 */

import { unwrapResponse } from "@/lib/unwrap-response";

const ENGINE_ENDPOINT = "/api/engine/generate";
const EVE_ENDPOINT = "/api/engine";
const REQUEST_TIMEOUT_MS = 120000;
const EVE_TIMEOUT_MS = 180000;

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
 * POST to the engine API. Returns the response data on success, throws on error.
 * @param {Object} formData - { name, birthDate, birthTime, birthLocation, email, notes? }
 * @param {Object} [options] - { dryRun?: boolean } when true, request dry-run (no OpenAI calls).
 * @returns {Promise<{ reportId: string, emotional_snippet: string, image_prompts: string[], vector_zero?: object }>}
 */
export async function submitToEngine(formData, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(ENGINE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildEnginePayload(formData, options)),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await unwrapResponse(res);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * POST to the E.V.E. API (LIGS engine + Beauty filter). Returns the Beauty Profile.
 * Use this for the Beauty page full report; it runs through E.V.E. and stays on Beauty.
 * @param {Object} formData - { name, birthDate, birthTime, birthLocation, email, notes? }
 * @returns {Promise<{ reportId?: string, vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts }>}
 */
export async function submitToEve(formData) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EVE_TIMEOUT_MS);
  try {
    const res = await fetch(EVE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildEnginePayload(formData)),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await unwrapResponse(res);
  } finally {
    clearTimeout(timeoutId);
  }
}
