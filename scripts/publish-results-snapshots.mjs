// Builds the public results JSON snapshots from Postgres and publishes the ones
// that changed to the R2 bucket the site reads from. Replaces POST /api/revalidate.
//
//   DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY  (required)
//   R2_BUCKET   (default: slavicalliance-results-data)
//   --dry-run   write snapshots to ./.snapshots instead of uploading
//   --force     rebuild and upload even when the data fingerprint is unchanged
//
// Before the expensive full read, one cheap query fingerprints every table the
// snapshots are built from (server-side, a few bytes of egress). When it matches
// the fingerprint stored after the previous publish, nothing is read or uploaded.
import { createHash } from "node:crypto"
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { build } from "esbuild"
import pg from "pg"
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3"

process.env.QUIZ_RESULTS_QUERY_TIMEOUT_MS ??= "60000"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const dryRun = process.argv.includes("--dry-run")
const force = process.argv.includes("--force")
const manifestKey = "manifest.json"
const fingerprintKey = "fingerprint.json"
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

// Tables the snapshot queries read. Row hashes are summed server-side, so the
// result is order independent and tiny regardless of table size.
const fingerprintTables = [
  "quiz_results",
  "quiz_manual_results",
  "quiz_leagues",
  "quiz_league_teams",
  "quiz_pub_reservations",
  "teams"
]

const sourceFingerprint = async () => {
  // Snapshot content also depends on the code and on today's date (upcoming
  // reservations), so both are part of the fingerprint.
  const dir = join(root, "packages/results-data/src")
  const hash = createHash("sha256")

  for (const name of (await readdir(dir)).filter((n) => n.endsWith(".ts") && !n.includes(".test.")).sort()) {
    hash.update(name).update(await readFile(join(dir, name)))
  }

  hash.update(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date()))
  return hash.digest("hex")
}

const dataFingerprint = async () => {
  const pool = new pg.Pool({ connectionString: requireEnv("DATABASE_URL"), max: 1 })

  try {
    const parts = []

    for (const table of fingerprintTables) {
      const { rows } = await pool.query(
        `select count(*)::text as n, coalesce(sum(hashtext(t::text)::bigint), 0)::text as h from public.${table} t`
      )
      parts.push(`${table}:${rows[0].n}:${rows[0].h}`)
    }

    return sha256(`${await sourceFingerprint()}|${parts.join("|")}`)
  } finally {
    await pool.end()
  }
}

const main = async () => {
  requireEnv("DATABASE_URL")
  let fingerprint = null
  let client = null
  let bucket = null

  if (!dryRun) {
    bucket = process.env.R2_BUCKET?.trim() || "slavicalliance-results-data"
    client = new S3Client({
      region: "auto",
      endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY")
      }
    })

    fingerprint = await dataFingerprint()

    if (!force) {
      try {
        const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: fingerprintKey }))

        if ((await response.Body.transformToString()).trim() === fingerprint) {
          console.log("Data unchanged since the last publish, nothing to do (use --force to rebuild).")
          return
        }
      } catch (error) {
        if (error?.name !== "NoSuchKey") {
          throw error
        }
      }
    }
  }

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

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fingerprintKey,
      Body: fingerprint,
      ContentType: "text/plain; charset=utf-8",
      CacheControl: "no-store"
    })
  )

  console.log(`Uploaded ${changed.length} changed, deleted ${stale.length} stale, ${files.size} total.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
