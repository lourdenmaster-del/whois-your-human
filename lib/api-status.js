/**
 * Client-side API status for the production kill-switch.
 * Fetches GET /api/status to know when LIGS_API_OFF=1 (maintenance mode).
 */

let statusPromise = null;

/**
 * Returns { disabled: boolean }. Shares a single in-flight request.
 */
export async function fetchApiStatus() {
  if (!statusPromise) {
    statusPromise = fetch("/api/status")
      .then((r) => r.json())
      .then((d) => ({ disabled: !!d.disabled }))
      .catch(() => ({ disabled: false }));
  }
  return statusPromise;
}
