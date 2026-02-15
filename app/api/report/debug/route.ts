import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import {
  getStorageInfo,
  listBlobReportPathnames,
  getMemoryReportIds,
} from "@/lib/report-store";

/**
 * GET /api/report/debug
 * Returns where reports are stored and how to fetch one (test pattern).
 */
export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, method: "GET", path: "/api/report/debug" });
  const info = getStorageInfo();
  const blobPathnames =
    info.storage === "blob" ? await listBlobReportPathnames() : undefined;
  const memoryReportIds =
    info.storage === "memory" ? getMemoryReportIds() : undefined;
  return successResponse(
    200,
    {
      ...info,
      blobPathnames,
      memoryReportIds,
      testPattern: {
        step1: "POST /api/engine with { fullName, birthDate, birthTime?, birthLocation, email }",
        step2: "Response includes reportId",
        step3: `GET /api/report/{reportId} returns { full_report, emotional_snippet, image_prompts }`,
        whereStored:
          info.storage === "blob"
            ? `Vercel Blob at pathnames: ${info.blobPathnamePattern}`
            : `In-memory (this process); ${info.inMemoryCount} report(s) currently.`,
      },
    },
    requestId
  );
}
