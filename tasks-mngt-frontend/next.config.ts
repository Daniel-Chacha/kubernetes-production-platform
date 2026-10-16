
import type { NextConfig } from "next";

const apiUrl =
  process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8081";

const nextConfig: NextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*/`,
      },
    ];
  },
};

export default nextConfig;

