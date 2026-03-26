"use client";

import { useEffect } from "react";

export default function IocSpecSignal() {
  useEffect(() => {
    console.info("[IOC] interface spec loaded");
  }, []);
  return null;
}
