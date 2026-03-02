import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // avoids dev double-mount flicker (on/off/on)
  async redirects() {
    return [
      { source: "/", destination: "/origin", permanent: false },
      { source: "/beauty", destination: "/origin", permanent: true },
      { source: "/beauty/", destination: "/origin", permanent: true },
    ];
  },
};

export default nextConfig;
