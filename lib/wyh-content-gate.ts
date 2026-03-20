/**
 * HttpOnly cookie set when Stripe verify-session confirms payment.
 * Middleware uses it to allow WHOIS agent-doc and case-study pages in the browser.
 */
export const WYH_CONTENT_GATE_COOKIE = "wyh_content_gate";

export function wyhContentGateCookieOptions(): {
  path: string;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
} {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 400,
  };
}
