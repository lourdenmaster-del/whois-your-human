"use client";

import { useState, useEffect } from "react";
import { fetchApiStatus } from "@/lib/api-status";

/**
 * Returns { disabled: boolean, loading: boolean }.
 * Use disabled to hide/disable sensitive buttons (generate, checkout, etc).
 */
export function useApiStatus() {
  const [status, setStatus] = useState({ disabled: false, loading: true });

  useEffect(() => {
    fetchApiStatus().then((s) => setStatus({ ...s, loading: false }));
  }, []);

  return status;
}
