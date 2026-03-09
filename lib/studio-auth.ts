/**
 * Minimal token gate for LIGS Studio and waitlist/list.
 * When LIGS_STUDIO_TOKEN is set, access requires the token via cookie or ?token= query.
 * When unset, access is allowed (no protection).
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

/**
 * Verify token from cookie or query param. Returns true if access allowed.
 */
export function verifyStudioAccess(
  cookieValue: string | null,
  queryToken: string | null
): boolean {
  const expected = getStudioToken();
  if (!expected) return true; // no protection
  const provided = cookieValue ?? queryToken;
  if (!provided) return false;
  return provided === expected;
}

export function getStudioAuthCookieHeader(): string {
  const token = getStudioToken();
  if (!token) return "";
  const secure = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax${secure ? "; Secure" : ""}; HttpOnly`;
}

export { COOKIE_NAME };
