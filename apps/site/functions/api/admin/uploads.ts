import { isAuthenticated } from "../../_lib/admin.js"
import { Env, json } from "../../_shared/content"

interface PagesContext {
  env: Env
  request: Request
}

const safeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")

export const onRequestPost = async ({ env, request }: PagesContext) => {
  if (!(await isAuthenticated(request, env))) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get("file")

  if (!(file instanceof File)) {
    return json({ error: "Missing file." }, { status: 400 })
  }

  const name = safeName(file.name)
  const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${name}`

  await env.CONTENT_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: { originalName: file.name }
  })

  return json({ key, url: `/api/assets/${key.replace(/^uploads\//, "")}` })
}
