import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/comptes/:path*",
        destination: "/accounts/:path*",
        permanent: false,
      },
      {
        source: "/objectifs/:path*",
        destination: "/goals/:path*",
        permanent: false,
      },
      {
        source: "/analyses/:path*",
        destination: "/analytics/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
