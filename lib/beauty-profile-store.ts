import { put, head } from "@vercel/blob";
import { assertBeautyProfileV1 } from "@/lib/beauty-profile-schema";
import type { BeautyProfileV1 } from "@/lib/beauty-profile-schema";
import { log } from "@/lib/log";
import { BLOB_BEAUTY_PREFIX } from "@/lib/report-store";

function useBlob(): boolean {
  return typeof process.env.BLOB_READ_WRITE_TOKEN === "string" && process.env.BLOB_READ_WRITE_TOKEN.length > 0;
}

export async function saveBeautyProfileV1(
  reportId: string,
  profile: BeautyProfileV1,
  requestId: string
): Promise<void> {
  assertBeautyProfileV1(profile);
  if (!useBlob()) {
    throw new Error("BEAUTY_PROFILE_WRITE_FAILED");
  }
  const pathname = `${BLOB_BEAUTY_PREFIX}${reportId}.json`;
  log("info", "beauty_profile_save_start", { requestId, reportId });
  try {
    await put(pathname, JSON.stringify(profile), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } catch {
    throw new Error("BEAUTY_PROFILE_WRITE_FAILED");
  }
  log("info", "beauty_profile_save_end", { requestId, reportId });
}

export async function loadBeautyProfileV1(
  reportId: string,
  requestId: string
): Promise<BeautyProfileV1> {
  log("info", "beauty_profile_load_start", { requestId, reportId });
  if (!useBlob()) {
    throw new Error("BEAUTY_PROFILE_NOT_FOUND");
  }
  const pathname = `${BLOB_BEAUTY_PREFIX}${reportId}.json`;
  let text: string;
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url);
    if (!res.ok) {
      throw new Error("BEAUTY_PROFILE_NOT_FOUND");
    }
    text = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "BEAUTY_PROFILE_NOT_FOUND" || msg === "BEAUTY_PROFILE_PARSE_FAILED" || msg === "BEAUTY_PROFILE_SCHEMA_MISMATCH") {
      throw e;
    }
    throw new Error("BEAUTY_PROFILE_NOT_FOUND");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("BEAUTY_PROFILE_PARSE_FAILED");
  }
  try {
    assertBeautyProfileV1(parsed);
  } catch {
    throw new Error("BEAUTY_PROFILE_SCHEMA_MISMATCH");
  }
  log("info", "beauty_profile_load_end", { requestId, reportId });
  return parsed as BeautyProfileV1;
}
