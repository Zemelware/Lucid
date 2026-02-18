import type { NextConfig } from "next";

const isMobileExport = process.env.NEXT_EXPORT_MODE === "1";

const nextConfig: NextConfig = {
  distDir: ".next-build",
  output: isMobileExport ? "export" : undefined,
  pageExtensions: isMobileExport ? ["tsx", "jsx"] : undefined,
  images: isMobileExport
    ? {
        unoptimized: true,
      }
    : undefined,
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }

    return config;
  }
};

export default nextConfig;
