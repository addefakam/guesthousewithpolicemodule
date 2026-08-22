import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  compress: true,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs", "pg", "sharp"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "@radix-ui/react-icons"],
  },
};

export default nextConfig;