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
  // Prevent Vercel's edge CDN AND the browser from caching the HTML
  // navigation shell. The shell references content-hashed JS chunks,
  // so a stale cached shell pulls in stale chunks and makes deployed
  // changes invisible to users until their cache expires.
  //
  // - no-store, max-age=0, must-revalidate: browser revalidates on
  //   every navigation. Vercel's CDN revalidates with the origin too.
  // - Only applies to navigational HTML, NOT to /_next/static/* chunks
  //   (which are content-hashed and safe to cache forever).
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico|sw.js|app-icons|manifest.json).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;