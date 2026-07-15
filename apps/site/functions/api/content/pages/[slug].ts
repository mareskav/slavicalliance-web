import { Env, fallbackPages, json, pageFromMarkdown, pageKey } from "../../../_shared/content"
import {
  browserRevalidatedResponse,
  cachePageContentResponse,
  getCachedPageContentResponse
} from "../../../_shared/content-cache"

interface PagesContext {
  env: Env
  request: Request
  params: { slug: string }
  waitUntil?: (promise: Promise<unknown>) => void
}

export const onRequestGet = async ({ env, request, params, waitUntil }: PagesContext) => {
  const slug = params.slug
  const shouldCache = slug === "landing"

  if (shouldCache) {
    const cached = await getCachedPageContentResponse(request, slug)
    if (cached) {
      return browserRevalidatedResponse(cached)
    }
  }

  const object = await env.CONTENT_BUCKET.get(pageKey(slug))
  const raw = object ? await object.text() : (fallbackPages[slug] ?? null)

  if (!raw) {
    return json({ error: "Page not found." }, { status: 404 })
  }

  const response = json(pageFromMarkdown(slug, raw), { headers: { "cache-control": "no-cache" } })

  if (shouldCache) {
    cachePageContentResponse(request, slug, response, waitUntil)
  }

  return response
}
