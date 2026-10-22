import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "path";

// Tự động nạp file .env từ thư mục gốc của dự án CNPM
const rootDir = path.resolve(__dirname, "../../");
loadEnvConfig(rootDir);

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK || process.env.NEXT_PUBLIC_USE_MOQ || "false",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

