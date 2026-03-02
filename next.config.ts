import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // avoids dev double-mount flicker (on/off/on)
  // Redirects handled by middleware.ts (more reliable on Vercel)
};

export default nextConfig;
