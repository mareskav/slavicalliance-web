import { describe, expect, it } from "vitest"
import { createSessionCookie, getSession, isAdmin, isAuthenticated } from "./admin.js"

const secret = "test-secret"
const env = { SESSION_SECRET: secret }

const base64UrlEncode = (input) =>
  btoa(input).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")

const sign = async (value) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))
}

const buildCookie = async (payloadObject) => {
  const payload = base64UrlEncode(JSON.stringify(payloadObject))
  const signature = await sign(payload)
  return `sa_admin_session=${payload}.${signature}`
}

const extractCookiePair = (setCookieHeader) => setCookieHeader.split(";")[0]

const requestWithCookie = (cookie) =>
  new Request("https://example.com/", cookie ? { headers: { Cookie: cookie } } : {})

describe("admin session (apps/site)", () => {
  it("round-trips a valid admin session", async () => {
    const setCookie = await createSessionCookie(env, "admin")
    const request = requestWithCookie(extractCookiePair(setCookie))

    const session = await getSession(request, env)

    expect(session).toEqual({ role: "admin", exp: expect.any(Number) })
    expect(await isAdmin(request, env)).toBe(true)
    expect(await isAuthenticated(request, env)).toBe(true)
  })

  it("rejects a tampered signature", async () => {
    const setCookie = await createSessionCookie(env, "admin")
    const [payload, signature] = extractCookiePair(setCookie).split("=")[1].split(".")
    const tampered = `sa_admin_session=${payload}.${signature.slice(0, -1)}${signature.at(-1) === "A" ? "B" : "A"}`
    const request = requestWithCookie(tampered)

    expect(await getSession(request, env)).toBeNull()
    expect(await isAuthenticated(request, env)).toBe(false)
  })

  it("rejects an expired session", async () => {
    const cookie = await buildCookie({ role: "admin", exp: Math.floor(Date.now() / 1000) - 10 })
    const request = requestWithCookie(cookie)

    expect(await getSession(request, env)).toBeNull()
  })

  it("rejects a legacy payload with no role claim", async () => {
    const cookie = await buildCookie({ exp: Math.floor(Date.now() / 1000) + 1000 })
    const request = requestWithCookie(cookie)

    expect(await getSession(request, env)).toBeNull()
    expect(await isAdmin(request, env)).toBe(false)
    expect(await isAuthenticated(request, env)).toBe(false)
  })

  it("rejects an unknown role", async () => {
    const cookie = await buildCookie({ role: "superadmin", exp: Math.floor(Date.now() / 1000) + 1000 })
    const request = requestWithCookie(cookie)

    expect(await getSession(request, env)).toBeNull()
  })

  it("rejects when there is no cookie at all", async () => {
    const request = requestWithCookie(null)

    expect(await getSession(request, env)).toBeNull()
    expect(await isAdmin(request, env)).toBe(false)
  })
})
