import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const target = process.env.LAG_PREVIEW_API_TARGET;
    return target ? [{ source: "/api/:path*", destination: `${target}/api/:path*` }] : [];
  },
};

export default nextConfig;
