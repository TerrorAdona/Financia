import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/comptes/:path*",
        destination: "/accounts/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
