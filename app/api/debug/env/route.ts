import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.OPENAI_API_KEY || "";
  return NextResponse.json({
    cwd: process.cwd(),
    envLocalLoadedHint: true,
    openaiKeyPrefix: key.slice(0, 12),
    openaiKeyLength: key.length,
    allowExternalWrites: process.env.ALLOW_EXTERNAL_WRITES,
    nodeEnv: process.env.NODE_ENV,
  });
}
