import { describe, expect, it, vi } from "vitest"
import { createSessionCookie } from "../../_lib/admin.js"
import { onRequestPut as pagesPut } from "./content/pages/[slug]"
import { onRequestPut as postsPut } from "./content/posts/[slug]"
import { onRequestPost as uploadsPost } from "./uploads"

const secret = "test-secret"
const sessionEnv = { SESSION_SECRET: secret }

const cookieHeaderFor = async (role) => {
  const setCookie = await createSessionCookie(sessionEnv, role)
  return setCookie.split(";")[0]
}

const buildEnv = () => ({
  SESSION_SECRET: secret,
  CONTENT_BUCKET: { put: vi.fn(async () => undefined) }
})

const cases = [
  {
    name: "content/pages/[slug]",
    invoke: (env, cookie) => {
      const request = new Request("https://example.com/api/admin/content/pages/landing", {
        method: "PUT",
        headers: cookie ? { Cookie: cookie } : undefined,
        body: JSON.stringify({ raw: "---\ntitle: Test\n---\nBody" })
      })
      return pagesPut({ env, request, params: { slug: "landing" } })
    }
  },
  {
    name: "content/posts/[slug]",
    invoke: (env, cookie) => {
      const request = new Request("https://example.com/api/admin/content/posts/hello", {
        method: "PUT",
        headers: cookie ? { Cookie: cookie } : undefined,
        body: JSON.stringify({ raw: "---\ntitle: Test\n---\nBody" })
      })
      return postsPut({ env, request, params: { slug: "hello" } })
    }
  },
  {
    name: "uploads",
    invoke: (env, cookie) => {
      const formData = new FormData()
      formData.set("file", new File(["hello"], "test.txt", { type: "text/plain" }))
      const request = new Request("https://example.com/api/admin/uploads", {
        method: "POST",
        headers: cookie ? { Cookie: cookie } : undefined,
        body: formData
      })
      return uploadsPost({ env, request })
    }
  }
]

describe.each(cases)("$name", ({ invoke }) => {
  it("rejects when there is no session", async () => {
    const env = buildEnv()
    const response = await invoke(env, null)

    expect(response.status).toBe(401)
    expect(env.CONTENT_BUCKET.put).not.toHaveBeenCalled()
  })

  it("rejects a session with an unrecognized role", async () => {
    const env = buildEnv()
    const cookie = await cookieHeaderFor("superadmin")
    const response = await invoke(env, cookie)

    expect(response.status).toBe(401)
    expect(env.CONTENT_BUCKET.put).not.toHaveBeenCalled()
  })

  it("allows an admin session", async () => {
    const env = buildEnv()
    const cookie = await cookieHeaderFor("admin")
    const response = await invoke(env, cookie)

    expect(response.status).toBe(200)
    expect(env.CONTENT_BUCKET.put).toHaveBeenCalledTimes(1)
  })
})
