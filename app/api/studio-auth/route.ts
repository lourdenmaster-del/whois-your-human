/**
 * POST /api/studio-auth — Set LIGS Studio cookie without query params.
 * Body: { token: string } must match LIGS_STUDIO_TOKEN when protection is on.
 * On success sets HttpOnly cookie and returns { ok: true }.
 */

import { NextResponse } from "next/server";
import {
  isStudioProtected,
  getStudioToken,
  getStudioAuthCookieHeader,
} from "@/lib/studio-auth";

export async function POST(request: Request) {
  if (!isStudioProtected()) {
    return NextResponse.json({ ok: true, message: "Studio not token-protected" });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const provided =
    typeof body?.token === "string" ? body.token.trim() : "";
  const expected = getStudioToken();
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieHeader = getStudioAuthCookieHeader();
  if (!cookieHeader) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", cookieHeader);
  return res;
}
