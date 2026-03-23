/**
 * Parse JSON and unwrap unified success envelope.
 * If status === "ok", returns json.data. Otherwise throws an Error with message, status, requestId.
 */
export async function unwrapResponse<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({})) as {
    status?: string;
    data?: T;
    error?: string;
    requestId?: string;
  };
  if (json?.status === "ok") {
    return json.data as T;
  }
  const message =
    json?.error ??
    json?.message ??
    (response.status ? `Request failed (HTTP ${response.status})` : "Unknown error");
  const err = new Error(message) as Error & { status?: number; requestId?: string };
  err.status = response.status;
  err.requestId = json?.requestId;
  throw err;
}
