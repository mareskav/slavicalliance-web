import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("../", import.meta.url))
const targetSuffix = join(
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "utils",
  "ensure-r2-bucket.js"
)
const candidates = [
  join(repoRoot, targetSuffix),
  join(repoRoot, "apps", "results", targetSuffix),
]
const target = candidates.find((candidate) => existsSync(candidate))

if (!target) {
  throw new Error(`OpenNext R2 provisioning file not found in: ${candidates.join(", ")}`)
}

const marker = "OPEN_NEXT_SKIP_R2_BUCKET_PROVISION"
const source = readFileSync(target, "utf8")

if (source.includes(marker)) {
  console.log("OpenNext R2 provisioning patch already applied")
  process.exit(0)
}

const needle = "export async function ensureR2Bucket(projectDir, bucketName, jurisdiction) {\n    try {"
const replacement = `export async function ensureR2Bucket(projectDir, bucketName, jurisdiction) {
    if (process.env.${marker} === "true") {
        return { success: true, bucketName };
    }
    try {`

if (!source.includes(needle)) {
  throw new Error("OpenNext R2 provisioning function did not match expected shape")
}

writeFileSync(target, source.replace(needle, replacement))
console.log("Patched OpenNext R2 provisioning check")
