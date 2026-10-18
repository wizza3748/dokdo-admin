import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolated local review servers must not share Next's development lock/cache.
  ...(process.env.NODE_ENV === "development" && process.env.DOKDO_LOCAL_STATE_DIR ? { distDir: ".next-spec-review" } : {}),
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
