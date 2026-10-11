// Builds the public results JSON snapshots from Postgres and publishes the ones
// that changed to the R2 bucket the site reads from. Replaces POST /api/revalidate.
//
//   DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY  (required)
//   R2_BUCKET   (default: slavicalliance-results-data)
//   --dry-run   write snapshots to ./.snapshots instead of uploading
import { createHash } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { build } from "esbuild"
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const dryRun = process.argv.includes("--dry-run")
const manifestKey = "manifest.json"
const indexKey = "index.json"
const concurrency = 8
const cacheControl = "public, max-age=60"  // keep in sync with snapshotCacheControl in snapshot-paths.ts

const requireEnv = (name) => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing ${name}`)
  }

  return value
}

const loadBuilder = async () => {
  // The data package is TypeScript with extensionless imports; bundle it once
  // instead of depending on a TS runtime.
  const outfile = join(root, `node_modules/.cache/results-snapshots-${process.pid}.mjs`)

  await build({
    entryPoints: [join(root, "packages/results-data/src/snapshots.ts")],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    logLevel: "error"
  })

  const quizResults = await import(pathToFileURL(outfile).href)
  await rm(outfile, { force: true })
  return quizResults
}

const sha256 = (text) => createHash("sha256").update(text).digest("hex")

const runPool = async (items, worker) => {
  const queue = [...items]
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        await worker(item)
      }
    })
  )
}

const main = async () => {
  requireEnv("DATABASE_URL")
  const { buildSnapshots } = await loadBuilder()
  const files = await buildSnapshots()
  console.log(`Built ${files.size} snapshots.`)

  if (dryRun) {
    const outDir = join(root, ".snapshots")
    await rm(outDir, { recursive: true, force: true })

    for (const [key, body] of files) {
      const target = join(outDir, key)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, body)
    }

    console.log(`Dry run: wrote snapshots to ${outDir}`)
    return
  }

  const bucket = process.env.R2_BUCKET?.trim() || "slavicalliance-results-data"
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY")
    }
  })

  let previous = {}

  try {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: manifestKey }))
    previous = JSON.parse(await response.Body.transformToString())
  } catch (error) {
    if (error?.name !== "NoSuchKey") {
      throw error
    }
  }

  const next = {}
  const changed = []

  for (const [key, body] of files) {
    next[key] = sha256(body)

    // index.json embeds generatedAt, so it is always re-uploaded.
    if (key === indexKey || previous[key] !== next[key]) {
      changed.push(key)
    }
  }

  await runPool(changed, (key) =>
    client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: files.get(key),
        ContentType: "application/json; charset=utf-8",
        CacheControl: cacheControl
      })
    )
  )

  const stale = Object.keys(previous).filter((key) => !(key in next))

  for (let index = 0; index < stale.length; index += 1000) {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: stale.slice(index, index + 1000).map((Key) => ({ Key })) }
      })
    )
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: manifestKey,
      Body: JSON.stringify(next),
      ContentType: "application/json; charset=utf-8",
      CacheControl: "no-store"
    })
  )

  console.log(`Uploaded ${changed.length} changed, deleted ${stale.length} stale, ${files.size} total.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
