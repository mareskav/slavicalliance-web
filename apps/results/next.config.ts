import type { NextConfig } from "next"
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

initOpenNextCloudflareForDev()

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..")

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.191"],
  basePath: "/vysledky",
  turbopack: {
    root: repoRoot,
  },
}

export default nextConfig
