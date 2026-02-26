"use client";

import { useEffect } from "react";
import { TEST_MODE } from "@/lib/dry-run-config";

/**
 * Logs "TEST MODE" to console when NEXT_PUBLIC_TEST_MODE=1.
 * No-op when TEST_MODE is false.
 */
export function TestModeLogger() {
  useEffect(() => {
    if (TEST_MODE) {
      console.log("TEST MODE");
    }
  }, []);
  return null;
}
