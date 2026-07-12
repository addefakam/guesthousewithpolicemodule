import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone",  // Disabled: causes process to die on this platform
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
