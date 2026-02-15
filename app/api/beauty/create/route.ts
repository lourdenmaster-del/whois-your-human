import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { successResponse } from "@/lib/success-response";
import { validateEngineBody } from "@/lib/validate-engine-body";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    await rateLimit(request, "beauty_create", 5, 60_000);
  } catch {
    return errorResponse(429, "RATE_LIMIT_EXCEEDED", requestId);
  }

  log("info", "request", { requestId, route: "/api/beauty/create" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "MISSING_FIELDS", requestId);
  }

  const validation = validateEngineBody(body);
  if (!validation.ok) {
    return errorResponse(400, "MISSING_FIELDS", requestId);
  }

  const { fullName, birthDate, birthTime, birthLocation, email } = validation.value;
  const origin =
    process.env.VERCEL_URL != null
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin;
  const eveUrl = `${origin}/api/eve`;

  log("info", "stage", { requestId, stage: "eve_request_start" });
  const res = await fetch(eveUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName,
      birthDate,
      birthTime: birthTime ?? "",
      birthLocation,
      email,
    }),
  });
  log("info", "stage", { requestId, stage: "eve_request_end" });

  const json = (await res.json().catch(() => ({}))) as {
    status?: string;
    data?: { reportId?: string };
    error?: string;
  };

  if (json?.status === "ok" && json.data?.reportId) {
    return successResponse(200, { reportId: json.data.reportId }, requestId);
  }

  const status = res.status >= 400 ? res.status : 500;
  return errorResponse(status, json?.error ?? "Unknown error", requestId);
}
