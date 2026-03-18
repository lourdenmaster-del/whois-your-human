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
 * Public-surface lockdown: /origin is the only public page; all other legacy routes redirect to /origin.
 *
 * 1) www → apex (308)
 * 2) / → rewrite to /origin (URL stays /)
 * 2a) /whois-your-human, /unlock, /api (exact) → pass through (public agent landing)
 * 3) /beauty, /beauty/* → /origin (308)
 * 4) /dossier, /voice → /origin (308)
 * 5) /ligs-studio, /ligs-studio/* → /origin (308) unless LIGS_STUDIO_TOKEN set and valid cookie (then allow)
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

  if (
    pathname === "/whois-your-human" ||
    pathname === "/whois-your-human/" ||
    pathname === "/whois-your-human/unlock" ||
    pathname === "/whois-your-human/unlock/" ||
    pathname === "/whois-your-human/api" ||
    pathname === "/whois-your-human/api/"
  ) {
    return NextResponse.next();
  }

  // 2b) /origin/ligs-studio or /origin/ligs-studio/* → /ligs-studio (fix wrong path; no such route under /origin)
  if (pathname === "/origin/ligs-studio" || pathname.startsWith("/origin/ligs-studio/")) {
    const rest = pathname.slice("/origin".length); // /ligs-studio or /ligs-studio/login etc.
    return NextResponse.redirect(new URL(rest + request.nextUrl.search, request.url), 302);
  }

  // 3) /beauty and all /beauty/* → /origin (public-surface lockdown)
  if (pathname === "/beauty" || pathname.startsWith("/beauty/")) {
    return NextResponse.redirect(new URL("/origin", request.url), 308);
  }

  // 4) /dossier, /voice → /origin (public-surface lockdown)
  if (pathname === "/dossier" || pathname === "/voice") {
    return NextResponse.redirect(new URL("/origin", request.url), 308);
  }

  // 5) /ligs-studio: no public access when LIGS_STUDIO_TOKEN set. All paths gated except /ligs-studio/login (cookie only).
  if (pathname.startsWith("/ligs-studio") && isStudioProtected()) {
    if (pathname === "/ligs-studio/login" || pathname === "/ligs-studio/login/") {
      return NextResponse.next();
    }
    const cookieValue = request.cookies.get(COOKIE_NAME)?.value ?? null;
    if (!verifyStudioAccess(cookieValue)) {
      return NextResponse.redirect(new URL("/ligs-studio/login", request.url), 302);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
