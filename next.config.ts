import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Disable image optimization to avoid sharp native binary issues in containers
  images: {
    unoptimized: true,
  },
};

export default nextConfig;