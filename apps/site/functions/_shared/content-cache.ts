interface ContentCache {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<unknown>
  delete(request: Request): Promise<boolean>
}

const cacheStorage = () => (globalThis as unknown as { caches?: { default?: ContentCache } }).caches

export const pageContentCacheRequest = (request: Request, slug: string) => {
  const url = new URL(request.url)
  url.pathname = `/api/content/pages/${slug}`
  url.search = ""

  return new Request(url.toString(), { method: "GET" })
}

export const getCachedPageContentResponse = async (request: Request, slug: string) => {
  const cache = cacheStorage()?.default
  if (!cache) return null

  try {
    return (await cache.match(pageContentCacheRequest(request, slug))) ?? null
  } catch {
    return null
  }
}

export const cachePageContentResponse = (
  request: Request,
  slug: string,
  response: Response,
  waitUntil?: (promise: Promise<unknown>) => void
) => {
  const cache = cacheStorage()?.default
  if (!cache || response.status !== 200) return

  const headers = new Headers(response.headers)
  headers.set("cache-control", "public, max-age=86400")

  const cachedResponse = new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })

  const operation = cache
    .put(pageContentCacheRequest(request, slug), cachedResponse)
    .catch(() => undefined)
  if (waitUntil) {
    waitUntil(operation)
  }
}

export const deletePageContentCache = async (request: Request, slug: string) => {
  const cache = cacheStorage()?.default
  if (!cache) return false

  try {
    return await cache.delete(pageContentCacheRequest(request, slug))
  } catch {
    return false
  }
}

export const browserRevalidatedResponse = (response: Response) => {
  const headers = new Headers(response.headers)
  headers.set("cache-control", "no-cache")

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}
