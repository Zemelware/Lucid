import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-build",
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }

    return config;
  }
};

export default nextConfig;
