import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ?? "ligs.io";

/**
 * IOC-only public surface: non-IOC page routes redirect to /ioc.
 * Non-IOC /api/* returns 404 except /api/ioc/* and Stripe webhook.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  if (host.startsWith("www.")) {
    const apexUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(apexUrl, 308);
  }

  if (pathname.startsWith("/api/")) {
    const allowed =
      pathname === "/api/ioc" ||
      pathname.startsWith("/api/ioc/") ||
      pathname === "/api/stripe/webhook" ||
      pathname.startsWith("/api/stripe/webhook/");
    if (!allowed) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.next();
  }

  if (pathname === "/ioc" || pathname.startsWith("/ioc/")) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/ioc", request.url), 308);
  }

  return NextResponse.redirect(new URL("/ioc", request.url), 308);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|json|woff2?|webmanifest)$).*)",
  ],
};
