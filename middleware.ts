import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isStudioProtected,
  verifyStudioAccess,
  COOKIE_NAME,
} from "@/lib/studio-auth";

const CANONICAL_HOST = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ?? "ligs.io";

/**
 * Single-hop redirect/rewrite: canonical host ligs.io, one hop max.
 *
 * 1) www → apex (308): www.ligs.io/* → https://ligs.io/*
 * 2) / → rewrite to /origin (no redirect, URL stays /)
 * 3) /beauty, /beauty/ → /origin (308)
 * 4) /ligs-studio: when LIGS_STUDIO_TOKEN set, require cookie (set via POST /api/studio-auth from /ligs-studio/login)
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  // 1) www → apex: one hop to canonical
  if (host.startsWith("www.")) {
    const apexUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(apexUrl, 308);
  }

  // 2) / → rewrite (serve /origin content, URL stays /)
  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/origin", request.url));
  }

  // 3) /beauty, /beauty/ → /origin when waitlist-only (default). When NEXT_PUBLIC_WAITLIST_ONLY=0,
  //    purchase flow may use /beauty again; do not redirect so BeautyLandingClient can render.
  const waitlistOnly = process.env.NEXT_PUBLIC_WAITLIST_ONLY !== "0";
  if (waitlistOnly && (pathname === "/beauty" || pathname === "/beauty/")) {
    return NextResponse.redirect(new URL("/origin", request.url), 308);
  }

  // 4) /ligs-studio: token gate when LIGS_STUDIO_TOKEN is set (cookie only; login at /ligs-studio/login)
  if (isStudioProtected() && pathname.startsWith("/ligs-studio")) {
    if (pathname === "/ligs-studio/login") {
      return NextResponse.next();
    }
    if (pathname === "/ligs-studio" || pathname.startsWith("/ligs-studio/")) {
      const cookieValue = request.cookies.get(COOKIE_NAME)?.value ?? null;
      if (!verifyStudioAccess(cookieValue)) {
        return NextResponse.redirect(new URL("/ligs-studio/login", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
