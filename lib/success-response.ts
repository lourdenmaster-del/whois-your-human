import { NextResponse } from "next/server";
import { log } from "@/lib/log";

/**
 * Returns a JSON success response with unified envelope and logs the response.
 */
export function successResponse<T>(
  status: number,
  data: T,
  requestId: string
): NextResponse {
  log("info", "response", { requestId, status });
  return NextResponse.json(
    { status: "ok", requestId, data },
    { status }
  );
}
