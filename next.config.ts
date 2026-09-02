import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.dokdo.app",
        pathname: "/readlearn/upload/**",
      },
    ],
  },
};

export default nextConfig;
