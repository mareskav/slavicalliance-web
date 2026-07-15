// Prebuild step: makes the /napsali-o-nas share preview (og:image) reliable.
//
// Social scrapers (Facebook, X/Twitter, Messenger, ...) sometimes fail to load
// images hosted on third-party CDNs (hotlink protection, expiring URLs, ...).
// If the newest press mention uses an external image, we download it into
// public/og so og:image is always served from our own domain. Local images
// (e.g. /press-facebook.jpg) need nothing and are left untouched.

import { existsSync } from "node:fs"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const siteRoot = process.cwd()
const localPressPath = path.join(siteRoot, "contents/pages/napsali-o-nas.md")
const ogDir = path.join(siteRoot, "public/og")
const ogCacheDir = path.join(siteRoot, ".og-cache")
const manifestPath = path.join(ogCacheDir, "og-manifest.json")
const localImageName = "napsali-o-nas"

const getContentSiteUrl = () => {
  const configured = process.env.CONTENT_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")
  // A `next build` is always a production build, so mirror press.ts and read
  // the live content by default (falls back to the local file on failure).
  return "https://slavicalliance.cz"
}

const readPressRaw = async () => {
  const siteUrl = getContentSiteUrl()

  if (siteUrl) {
    try {
      const response = await fetch(`${siteUrl}/api/content/pages/napsali-o-nas`, {
        cache: "no-store"
      })
      if (response.ok) {
        const payload = await response.json()
        if (payload && typeof payload.raw === "string" && payload.raw) return payload.raw
      }
    } catch {
      // fall through to local file
    }
  }

  if (!existsSync(localPressPath)) return ""
  return readFile(localPressPath, "utf8")
}

// The mentions are ordered newest-first, so the first "Obrázek:" line in the
// file is the newest mention that carries an image.
const findLatestImage = (raw) => {
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*Obr[áa]zek:\s*(.+)$/i)
    if (match) {
      const value = match[1].trim()
      if (value) return value
    }
  }
  return null
}

const extensionFor = (contentType, url) => {
  const type = (contentType || "").split(";")[0].trim().toLowerCase()
  if (type === "image/jpeg" || type === "image/jpg") return "jpg"
  if (type === "image/png") return "png"
  if (type === "image/webp") return "webp"
  if (type === "image/gif") return "gif"

  const fromUrl = url.split("?")[0].match(/\.(jpe?g|png|webp|gif)$/i)
  if (fromUrl) return fromUrl[1].toLowerCase() === "jpeg" ? "jpg" : fromUrl[1].toLowerCase()

  return "jpg"
}

const clearManifest = async () => {
  await rm(manifestPath, { force: true }).catch(() => {})
}

const main = async () => {
  const raw = await readPressRaw()
  const latestImage = findLatestImage(raw)

  // Nothing to localize: no image, or the newest image is already same-origin.
  if (!latestImage || !/^https?:\/\//i.test(latestImage)) {
    await clearManifest()
    return
  }

  const response = await fetch(latestImage, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
    }
  })
  if (!response.ok) {
    console.warn(`[og] Nepodařilo se stáhnout OG obrázek (${response.status}): ${latestImage}`)
    await clearManifest()
    return
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const ext = extensionFor(response.headers.get("content-type"), latestImage)
  const fileName = `${localImageName}.${ext}`
  const localPath = `/og/${fileName}`

  await mkdir(ogDir, { recursive: true })
  await writeFile(path.join(ogDir, fileName), buffer)

  await mkdir(ogCacheDir, { recursive: true })
  await writeFile(
    manifestPath,
    JSON.stringify({ "napsali-o-nas": { source: latestImage, local: localPath } }, null, 2)
  )

  console.log(`[og] OG obrázek zlokalizován: ${latestImage} -> ${localPath}`)
}

main().catch((error) => {
  console.warn("[og] prepare-og-image selhal, pokračuji s původním obrázkem:", error?.message)
})
