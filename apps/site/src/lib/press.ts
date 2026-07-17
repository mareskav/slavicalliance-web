import fs from "fs"
import path from "path"
import matter from "gray-matter"

export type PressSourceType = "article" | "facebook"

export interface PressMention {
  source: string
  sourceType: PressSourceType
  title: string
  excerpt: string
  date: string
  href: string
  imageUrl?: string
}

const pressPath = path.join(process.cwd(), "contents/pages/napsali-o-nas.md")
const defaultProductionContentSiteUrl = "https://slavicalliance.cz"

const getContentSiteUrl = () => {
  const configured = process.env.CONTENT_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")

  if (process.env.NODE_ENV === "production") {
    return defaultProductionContentSiteUrl
  }

  return ""
}

const readPressRaw = async (): Promise<string> => {
  const siteUrl = getContentSiteUrl()

  if (siteUrl) {
    try {
      const response = await fetch(`${siteUrl}/api/content/pages/napsali-o-nas`, {
        cache: "no-store"
      })
      if (response.ok) {
        const payload = (await response.json()) as { raw?: string }
        if (payload.raw) return payload.raw
      }
    } catch {
      // fall through to local file
    }
  }

  if (!fs.existsSync(pressPath)) return ""
  return fs.readFileSync(pressPath, "utf8")
}

const extractMetaImage = (html: string) => {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }

  return undefined
}

const getArticlePreviewImage = async (href: string) => {
  if (!/^https?:\/\//i.test(href)) return undefined

  try {
    const response = await fetch(href, {
      cache: "force-cache",
      headers: {
        accept: "text/html",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) return undefined

    return extractMetaImage(await response.text())
  } catch {
    return undefined
  }
}

const withArticlePreviewImages = async (mentions: PressMention[]) =>
  Promise.all(
    mentions.map(async (mention) => {
      if (mention.imageUrl || mention.sourceType !== "article") {
        return mention
      }

      const imageUrl = await getArticlePreviewImage(mention.href)
      return imageUrl ? { ...mention, imageUrl } : mention
    })
  )

const normaliseType = (value: string): PressSourceType =>
  value.trim().toLowerCase() === "facebook" ? "facebook" : "article"

export const parsePressMentions = (raw: string): PressMention[] => {
  const { content } = matter(raw)
  const lines = content.split(/\r?\n/)
  const mentions: PressMention[] = []

  type Draft = {
    title: string
    source: string
    sourceType: PressSourceType
    date: string
    href: string
    imageUrl?: string
    abstract?: string
    excerptLines: string[]
  }

  let current: Draft | null = null

  const flush = () => {
    if (!current || !current.title) return
    mentions.push({
      title: current.title,
      source: current.source,
      sourceType: current.sourceType,
      date: current.date,
      href: current.href || "#",
      imageUrl: current.imageUrl || undefined,
      excerpt: current.abstract || current.excerptLines.join(" ").trim()
    })
  }

  for (const line of lines) {
    const heading = line.match(/^##\s+(.*)$/)
    if (heading) {
      flush()
      current = {
        title: heading[1].trim(),
        source: "",
        sourceType: "article",
        date: "",
        href: "",
        abstract: undefined,
        excerptLines: []
      }
      continue
    }

    if (!current) continue

    const meta = line.match(/^\s*-\s*([^:]+):\s*(.*)$/)
    if (meta) {
      const key = meta[1].trim().toLowerCase()
      const value = meta[2].trim()

      if (key === "zdroj") current.source = value
      else if (key === "typ") current.sourceType = normaliseType(value)
      else if (key === "datum") current.date = value
      else if (key === "odkaz") current.href = value
      else if (key === "obrázek" || key === "obrazek") current.imageUrl = value || undefined
      else if (key === "abstract" || key === "abstrakt") current.abstract = value
      continue
    }

    if (line.trim()) current.excerptLines.push(line.trim())
  }

  flush()
  return mentions
}

export const getPressMentions = async (): Promise<PressMention[]> =>
  withArticlePreviewImages(parsePressMentions(await readPressRaw()))

const ogManifestPath = path.join(process.cwd(), ".og-cache/og-manifest.json")

// If the prebuild step localized an external image (see scripts/prepare-og-image.mjs),
// swap the original URL for the same-origin copy so social scrapers load it reliably.
const resolveShareImage = (imageUrl?: string): string | undefined => {
  if (!imageUrl) return undefined

  try {
    if (fs.existsSync(ogManifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(ogManifestPath, "utf8")) as {
        "napsali-o-nas"?: { source?: string; local?: string }
      }
      const entry = manifest["napsali-o-nas"]
      if (entry?.source === imageUrl && entry.local) return entry.local
    }
  } catch {
    // fall back to the original image
  }

  return imageUrl
}

export const getShareImage = async (): Promise<string | undefined> => {
  const mentions = await getPressMentions()
  const latest = mentions.find((mention) => mention.imageUrl)?.imageUrl
  return resolveShareImage(latest)
}
