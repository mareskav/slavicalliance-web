import { isAuthenticated, json, readGitHubFile, writeGitHubFile } from "../../_lib/admin.js"

export const onRequestGet = async ({ request, env }) => {
  try {
    if (!(await isAuthenticated(request, env))) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const path = url.searchParams.get("path")

    if (!path) {
      return json({ error: "Missing path" }, { status: 400 })
    }

    return json(await readGitHubFile(env, path))
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Read failed" }, { status: 500 })
  }
}

export const onRequestPut = async ({ request, env }) => {
  try {
    if (!(await isAuthenticated(request, env))) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    const { path, content, sha } = await request.json()

    if (!path || typeof content !== "string") {
      return json({ error: "Missing path or content" }, { status: 400 })
    }

    return json(await writeGitHubFile(env, path, content, sha))
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 500 })
  }
}
