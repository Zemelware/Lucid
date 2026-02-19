import type { NextConfig } from "next";

const isMobileExport = process.env.NEXT_EXPORT_MODE === "1";
const isDev = process.env.NODE_ENV === "development";
const distDir = isMobileExport ? ".next-build" : isDev ? ".next-dev" : ".next";

const nextConfig: NextConfig = {
  distDir,
  output: isMobileExport ? "export" : undefined,
  pageExtensions: isMobileExport ? ["tsx", "jsx", "js"] : undefined,
  eslint: isMobileExport
    ? {
        ignoreDuringBuilds: true,
      }
    : undefined,
  typescript: isMobileExport
    ? {
        ignoreBuildErrors: true,
      }
    : undefined,
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
