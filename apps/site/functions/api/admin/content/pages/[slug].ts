import { isAuthenticated } from "../../../../_lib/admin.js"
import { Env, json, pageFromMarkdown, pageKey } from "../../../../_shared/content"
import { deletePageContentCache } from "../../../../_shared/content-cache"

interface PagesContext {
  env: Env
  request: Request
  params: { slug: string }
}

export const onRequestPut = async ({ env, request, params }: PagesContext) => {
  if (!(await isAuthenticated(request, env))) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as { raw?: string }
  if (!body.raw) {
    return json({ error: "Missing raw Markdown." }, { status: 400 })
  }

  await env.CONTENT_BUCKET.put(pageKey(params.slug), body.raw, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" }
  })

  if (params.slug === "landing") {
    await deletePageContentCache(request, params.slug)
  }

  if (env.DEPLOY_HOOK_URL) {
    fetch(env.DEPLOY_HOOK_URL, { method: "POST" }).catch(() => {})
  }

  return json(pageFromMarkdown(params.slug, body.raw))
}
