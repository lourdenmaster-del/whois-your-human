/**
 * Production API kill-switch.
 * When LIGS_API_OFF=1, sensitive routes return 503 to prevent:
 * - Image generation (OpenAI costs)
 * - Blob writes
 * - Stripe checkout
 * - Marketing/exemplar generation
 */

export function isApiDisabled(): boolean {
  const val = process.env.LIGS_API_OFF;
  return val === "1" || val === "true";
}

/**
 * Call at the start of any sensitive POST handler.
 * Returns a 503 Response when LIGS_API_OFF=1, or null to continue.
 */
export function killSwitchResponse(): Response | null {
  if (!isApiDisabled()) return null;
  return Response.json({ disabled: true, reason: "maintenance" }, { status: 503 });
}
