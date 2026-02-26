import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // avoids dev double-mount flicker (on/off/on)
  async redirects() {
    return [{ source: "/", destination: "/beauty", permanent: false }];
  },
};

export default nextConfig;
