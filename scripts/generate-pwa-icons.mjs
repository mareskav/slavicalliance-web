#!/usr/bin/env node
// Generates PWA icons from apps/site/public/icon.png.
// Run once (or after icon.png changes):
//   node scripts/generate-pwa-icons.mjs

import sharp from "sharp"
import { fileURLToPath } from "url"
import path from "path"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const src = path.join(root, "apps/site/public/icon.png")
const outDir = path.join(root, "apps/site/public")

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
]

for (const { file, size } of targets) {
  await sharp(src)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, file))
  console.log(`✓  ${file}  (${size}×${size})`)
}
