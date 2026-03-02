import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware-based redirects (most reliable on Vercel).
 * next.config redirects are not relied upon here.
 *
 * - / → /origin (308 permanent)
 * - /beauty, /beauty/ → /origin (308 permanent)
 * - /beauty/start, /beauty/view, /beauty/success, /beauty/cancel → NOT redirected
 * - /api/*, _next, static assets → NOT redirected
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exact path redirects only — do not redirect /beauty/start, /beauty/view, etc.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/origin", request.url), 308);
  }
  if (pathname === "/beauty" || pathname === "/beauty/") {
    return NextResponse.redirect(new URL("/origin", request.url), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/beauty", "/beauty/"],
};
