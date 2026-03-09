import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isStudioProtected,
  verifyStudioAccess,
  getStudioAuthCookieHeader,
  COOKIE_NAME,
} from "@/lib/studio-auth";

const CANONICAL_HOST = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ?? "ligs.io";

/**
 * Single-hop redirect/rewrite: canonical host ligs.io, one hop max.
 *
 * 1) www → apex (308): www.ligs.io/* → https://ligs.io/*
 * 2) / → rewrite to /origin (no redirect, URL stays /)
 * 3) /beauty, /beauty/ → /origin (308)
 * 4) /ligs-studio: when LIGS_STUDIO_TOKEN set, require ?token= or cookie
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

  // 4) /ligs-studio: token gate when LIGS_STUDIO_TOKEN is set
  if (pathname === "/ligs-studio" && isStudioProtected()) {
    const cookieValue = request.cookies.get(COOKIE_NAME)?.value ?? null;
    const queryToken = request.nextUrl.searchParams.get("token");
    const allowed = verifyStudioAccess(cookieValue, queryToken);
    if (!allowed) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const cookieHeader = getStudioAuthCookieHeader();
    if (cookieHeader && queryToken) {
      const res = NextResponse.next();
      res.headers.append("Set-Cookie", cookieHeader);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
