import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let body: { event?: string; reportId?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "MISSING_EVENT", requestId);
  }

  const event = body?.event;
  if (event == null || typeof event !== "string" || event.trim() === "") {
    return errorResponse(400, "MISSING_EVENT", requestId);
  }

  const reportId = body?.reportId != null && typeof body.reportId === "string" ? body.reportId : undefined;

  log("info", "analytics_event", { requestId, event, reportId });

  return successResponse(200, { ok: true }, requestId);
}
