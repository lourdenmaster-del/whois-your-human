/**
 * Minimal token gate for LIGS Studio and waitlist/list.
 * When LIGS_STUDIO_TOKEN is set, access requires the HttpOnly cookie set via POST /api/studio-auth.
 * No query params or Bearer—cookie only. When unset, access is allowed (local dev).
 */

const COOKIE_NAME = "ligs_studio";
const TOKEN_ENV = "LIGS_STUDIO_TOKEN";

export function isStudioProtected(): boolean {
  const t = process.env[TOKEN_ENV];
  return typeof t === "string" && t.trim().length > 0;
}

export function getStudioToken(): string | undefined {
  const t = process.env[TOKEN_ENV]?.trim();
  return t && t.length > 0 ? t : undefined;
}

/** Cookie-only. Returns true if access allowed. */
export function verifyStudioAccess(cookieValue: string | null): boolean {
  const expected = getStudioToken();
  if (!expected) return true;
  if (!cookieValue) return false;
  return cookieValue === expected;
}

export function getStudioAuthCookieHeader(): string {
  const token = getStudioToken();
  if (!token) return "";
  const secure = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax${secure ? "; Secure" : ""}; HttpOnly`;
}

export { COOKIE_NAME };
