import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // avoids dev double-mount flicker (on/off/on)
  // Redirects handled by middleware.ts (more reliable on Vercel)
  env: {
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  },
};

export default nextConfig;
