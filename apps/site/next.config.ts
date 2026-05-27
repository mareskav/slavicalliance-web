import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost:3000", "192.168.1.191"],
  output: "export",
  turbopack: {
    root: repoRoot,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
