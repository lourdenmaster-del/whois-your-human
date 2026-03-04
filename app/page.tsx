import { redirect } from "next/navigation";

/**
 * Root fallback: redirect to canonical landing if middleware/proxy is bypassed.
 * Middleware rewrites / → /origin; this prevents blank root on fallback.
 */
export default function RootPage() {
  redirect("/origin");
}
