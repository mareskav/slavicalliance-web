import { afterEach, describe, expect, it, vi } from "vitest"
import { getAdminSession } from "./admin-session"

// Same secret and payload shape as apps/site/functions/_lib/admin.test.js
// on purpose: this asserts the two independent HMAC implementations stay
// byte-for-byte compatible (a cookie minted by apps/site must verify here).
const secret = "test-secret"

const base64UrlEncode = (input: string) =>
  btoa(input).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")

const sign = async (value: string) => {
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

const buildCookie = async (payloadObject: Record<string, unknown>) => {
  const payload = base64UrlEncode(JSON.stringify(payloadObject))
  const signature = await sign(payload)
  return `sa_admin_session=${payload}.${signature}`
}

const requestWithCookie = (cookie: string | null) =>
  new Request("https://example.com/", cookie ? { headers: { Cookie: cookie } } : {})

describe("getAdminSession (apps/results)", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("round-trips a valid admin session", async () => {
    vi.stubEnv("SESSION_SECRET", secret)
    const cookie = await buildCookie({ role: "admin", exp: Math.floor(Date.now() / 1000) + 1000 })

    const session = await getAdminSession(requestWithCookie(cookie))

    expect(session).toEqual({ role: "admin", exp: expect.any(Number) })
  })

  it("rejects a tampered signature", async () => {
    vi.stubEnv("SESSION_SECRET", secret)
    const cookie = await buildCookie({ role: "admin", exp: Math.floor(Date.now() / 1000) + 1000 })
    const [name, value] = cookie.split("=")
    const [payload, signature] = value.split(".")
    const tampered = `${name}=${payload}.${signature.slice(0, -1)}${signature.at(-1) === "A" ? "B" : "A"}`

    expect(await getAdminSession(requestWithCookie(tampered))).toBeNull()
  })

  it("rejects an expired session", async () => {
    vi.stubEnv("SESSION_SECRET", secret)
    const cookie = await buildCookie({ role: "admin", exp: Math.floor(Date.now() / 1000) - 10 })

    expect(await getAdminSession(requestWithCookie(cookie))).toBeNull()
  })

  it("rejects a legacy payload with no role claim", async () => {
    vi.stubEnv("SESSION_SECRET", secret)
    const cookie = await buildCookie({ exp: Math.floor(Date.now() / 1000) + 1000 })

    expect(await getAdminSession(requestWithCookie(cookie))).toBeNull()
  })

  it("rejects an unknown role", async () => {
    vi.stubEnv("SESSION_SECRET", secret)
    const cookie = await buildCookie({ role: "superadmin", exp: Math.floor(Date.now() / 1000) + 1000 })

    expect(await getAdminSession(requestWithCookie(cookie))).toBeNull()
  })

  it("rejects when there is no cookie at all", async () => {
    vi.stubEnv("SESSION_SECRET", secret)

    expect(await getAdminSession(requestWithCookie(null))).toBeNull()
  })

  it("rejects when SESSION_SECRET is not configured", async () => {
    vi.stubEnv("SESSION_SECRET", "")
    const cookie = await buildCookie({ role: "admin", exp: Math.floor(Date.now() / 1000) + 1000 })

    expect(await getAdminSession(requestWithCookie(cookie))).toBeNull()
  })
})
