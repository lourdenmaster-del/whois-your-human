import { NextResponse } from "next/server";
import { killSwitchResponse } from "@/lib/api-kill-switch";
import { log } from "@/lib/log";
import { getArchetypeFromBirthdate } from "@/lib/ioc/archetype-from-birthdate";
import { buildIocFullProtocolResponse } from "@/lib/ioc/ioc-machine-protocol";
import { resolvePaidIocUnlockFromCheckoutSession } from "@/lib/ioc/ioc-paid-checkout-session";

export async function POST(request: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId =
    typeof body.ioc_checkout_session === "string" ? body.ioc_checkout_session.trim() : "";
  const birthdate = typeof body.birthdate === "string" ? body.birthdate.trim() : "";

  if (!sessionId) {
    log("info", "ioc_upgrade_denied", {
      endpoint: "/api/ioc/upgrade",
      path: "machine",
      success: false,
      reason: "missing_checkout_session",
    });
    return NextResponse.json({ ok: false, error: "payment_required" }, { status: 200 });
  }

  const resolved = await resolvePaidIocUnlockFromCheckoutSession(sessionId);

  if (!resolved.ok) {
    log("info", "ioc_upgrade_denied", {
      endpoint: "/api/ioc/upgrade",
      path: "machine",
      success: false,
      reason: resolved.reason,
      message: resolved.message,
    });
    return NextResponse.json({ ok: false, error: "payment_required" }, { status: 200 });
  }

  if (birthdate.length > 0) {
    const fromBirthdate = getArchetypeFromBirthdate(birthdate);
    if (fromBirthdate !== resolved.archetype) {
      log("info", "ioc_upgrade_denied", {
        endpoint: "/api/ioc/upgrade",
        path: "machine",
        success: false,
        reason: "birthdate_archetype_mismatch",
        archetype_session: resolved.archetype,
        archetype_birthdate: fromBirthdate,
      });
      return NextResponse.json({ ok: false, error: "payment_required" }, { status: 200 });
    }
  }

  log("info", "ioc_generate_full", {
    endpoint: "/api/ioc/upgrade",
    path: "machine",
    success: true,
    archetype: resolved.archetype,
  });

  return NextResponse.json(
    buildIocFullProtocolResponse({ archetype: resolved.archetype, iocFull: resolved.iocFull })
  );
}
