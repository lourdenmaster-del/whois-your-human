/**
 * POST /api/agent/register — agent-facing alias for POST /api/beauty/submit.
 * Same body, same persistence, same reportId. No duplicate registration logic.
 */
import { killSwitchResponse } from "@/lib/api-kill-switch";
import { log } from "@/lib/log";

export async function POST(request: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;

  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/agent/register" });

  const origin = new URL(request.url).origin;
  const body = await request.text();
  const contentType =
    request.headers.get("content-type") || "application/json";

  const res = await fetch(`${origin}/api/beauty/submit`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });

  const buf = await res.arrayBuffer();
  const ct = res.headers.get("content-type") || "application/json";

  return new Response(buf, {
    status: res.status,
    headers: { "Content-Type": ct },
  });
}
