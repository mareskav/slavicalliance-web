import { isAuthenticated } from "../../../../_lib/admin.js"
import { Env, json, postFromMarkdown, postKey } from "../../../../_shared/content"

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

  await env.CONTENT_BUCKET.put(postKey(params.slug), body.raw, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" }
  })

  return json(postFromMarkdown(params.slug, body.raw))
}
