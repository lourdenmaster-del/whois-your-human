import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ?? "ligs.io";

/**
 * Single-hop redirect/rewrite: canonical host ligs.io, one hop max.
 *
 * 1) www → apex (308): www.ligs.io/* → https://ligs.io/*
 * 2) / → rewrite to /origin (no redirect, URL stays /)
 * 3) /beauty, /beauty/ → /origin (308)
 *
 * /beauty/start, /beauty/view, etc. NOT redirected.
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

  // 3) /beauty, /beauty/ → /origin
  if (pathname === "/beauty" || pathname === "/beauty/") {
    return NextResponse.redirect(new URL("/origin", request.url), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|api|favicon\\.ico).*)"],
};
