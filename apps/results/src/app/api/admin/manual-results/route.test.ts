import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { queryManualResultsDatabase } = vi.hoisted(() => ({
  queryManualResultsDatabase: vi.fn()
}))

vi.mock("@/lib/manual-results-db", () => ({ queryManualResultsDatabase }))

const { GET, POST, PATCH } = await import("./route")

const secret = "test-secret"
const siteOrigin = "https://slavicalliance.cz"

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

const cookieFor = async (role: "admin") => {
  const payload = base64UrlEncode(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + 1000 }))
  const signature = await sign(payload)
  return `sa_admin_session=${payload}.${signature}`
}

const manualRow = {
  id: "1",
  team_id: null,
  team_name: "Slavic Alliance",
  quiz_date: new Date("2026-01-10T00:00:00.000Z"),
  points: 80,
  doplnovacek: null,
  pub: "Test Pub",
  note: null,
  status: "approved",
  submitted_by: "admin",
  submitted_at: new Date("2026-01-10T00:00:00.000Z"),
  updated_at: new Date("2026-01-10T00:00:00.000Z")
}

const buildRequest = (
  method: string,
  { cookie, origin, body }: { cookie?: string | null; origin?: string | null; body?: unknown } = {}
) => {
  const headers: Record<string, string> = {}
  if (cookie) headers.Cookie = cookie
  if (origin !== null) headers.Origin = origin ?? siteOrigin
  if (body !== undefined) headers["Content-Type"] = "application/json"

  return new Request("https://example.com/api/admin/manual-results", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

describe("manual-results route", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", secret)
    vi.stubEnv("SITE_APP_URL", siteOrigin)
    queryManualResultsDatabase.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe("GET", () => {
    it("rejects when there is no session", async () => {
      const response = await GET(buildRequest("GET"))

      expect(response.status).toBe(401)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("lists results for an authenticated admin", async () => {
      queryManualResultsDatabase.mockResolvedValueOnce({ rows: [manualRow] })
      const cookie = await cookieFor("admin")

      const response = await GET(buildRequest("GET", { cookie }))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.results).toHaveLength(1)
      expect(body.results[0].id).toBe("1")
    })
  })

  describe("POST", () => {
    const validBody = {
      teamName: "Slavic Alliance",
      quizDate: "2026-01-10",
      points: 80,
      pub: "Test Pub",
      note: "note"
    }

    it("rejects when there is no session", async () => {
      const response = await POST(buildRequest("POST", { body: validBody }))

      expect(response.status).toBe(401)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("allows an admin session to insert", async () => {
      queryManualResultsDatabase.mockResolvedValueOnce({ rows: [manualRow] })
      const cookie = await cookieFor("admin")

      const response = await POST(buildRequest("POST", { cookie, body: validBody }))

      expect(response.status).toBe(201)
      expect(queryManualResultsDatabase).toHaveBeenCalledTimes(1)
      const [, values] = queryManualResultsDatabase.mock.calls[0]
      expect(values).toEqual([
        null,
        "Slavic Alliance",
        "2026-01-10",
        80,
        null,
        "Test Pub",
        "note",
        "admin"
      ])
    })

    it("rejects a request with the wrong Origin header", async () => {
      const cookie = await cookieFor("admin")

      const response = await POST(
        buildRequest("POST", { cookie, origin: "https://evil.example.com", body: validBody })
      )

      expect(response.status).toBe(403)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("rejects a future quiz_date with 400", async () => {
      const cookie = await cookieFor("admin")
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10)

      const response = await POST(
        buildRequest("POST", { cookie, body: { ...validBody, quizDate: future } })
      )

      expect(response.status).toBe(400)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("rejects non-numeric points with 400", async () => {
      const cookie = await cookieFor("admin")

      const response = await POST(
        buildRequest("POST", { cookie, body: { ...validBody, points: "not-a-number" } })
      )

      expect(response.status).toBe(400)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("rejects points that aren't a half-point increment with 400", async () => {
      const cookie = await cookieFor("admin")

      const response = await POST(
        buildRequest("POST", { cookie, body: { ...validBody, points: 80.3 } })
      )

      expect(response.status).toBe(400)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("allows half-point increments for points", async () => {
      queryManualResultsDatabase.mockResolvedValueOnce({ rows: [manualRow] })
      const cookie = await cookieFor("admin")

      const response = await POST(
        buildRequest("POST", { cookie, body: { ...validBody, points: 80.5 } })
      )

      expect(response.status).toBe(201)
    })

    it("rejects a non-integer doplnovacek with 400", async () => {
      const cookie = await cookieFor("admin")

      const response = await POST(
        buildRequest("POST", { cookie, body: { ...validBody, doplnovacek: 2.5 } })
      )

      expect(response.status).toBe(400)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("rejects an empty team name with 400", async () => {
      const cookie = await cookieFor("admin")

      const response = await POST(buildRequest("POST", { cookie, body: { ...validBody, teamName: "" } }))

      expect(response.status).toBe(400)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("surfaces a mocked unique-violation as 409", async () => {
      const cookie = await cookieFor("admin")
      queryManualResultsDatabase.mockRejectedValueOnce(
        Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" })
      )

      const response = await POST(buildRequest("POST", { cookie, body: validBody }))
      const body = await response.json()

      expect(response.status).toBe(409)
      expect(body.error).toMatch(/already exists/i)
    })
  })

  describe("PATCH", () => {
    it("rejects when there is no session", async () => {
      const response = await PATCH(buildRequest("PATCH", { body: { id: "1", action: "reject" } }))

      expect(response.status).toBe(401)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("rejects a request with the wrong Origin header", async () => {
      const cookie = await cookieFor("admin")

      const response = await PATCH(
        buildRequest("PATCH", {
          cookie,
          origin: "https://evil.example.com",
          body: { id: "1", action: "reject" }
        })
      )

      expect(response.status).toBe(403)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("soft-deletes via status = 'rejected' and never issues a DELETE", async () => {
      queryManualResultsDatabase.mockResolvedValueOnce({
        rows: [{ ...manualRow, status: "rejected" }]
      })
      const cookie = await cookieFor("admin")

      const response = await PATCH(
        buildRequest("PATCH", { cookie, body: { id: "1", action: "reject" } })
      )
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.result.status).toBe("rejected")
      expect(queryManualResultsDatabase).toHaveBeenCalledTimes(1)
      const [sql] = queryManualResultsDatabase.mock.calls[0]
      expect(sql).toMatch(/status = 'rejected'/)
      expect(sql.toLowerCase()).not.toContain("delete from")
    })

    it("returns 404 when rejecting a row that does not exist", async () => {
      queryManualResultsDatabase.mockResolvedValueOnce({ rows: [] })
      const cookie = await cookieFor("admin")

      const response = await PATCH(
        buildRequest("PATCH", { cookie, body: { id: "999", action: "reject" } })
      )

      expect(response.status).toBe(404)
    })

    const validEditBody = {
      id: "1",
      teamName: "Slavic Alliance",
      quizDate: "2026-01-10",
      points: 80,
      pub: "Test Pub"
    }

    it("rejects points that aren't a half-point increment with 400", async () => {
      const cookie = await cookieFor("admin")

      const response = await PATCH(
        buildRequest("PATCH", { cookie, body: { ...validEditBody, points: 80.3 } })
      )

      expect(response.status).toBe(400)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })

    it("allows half-point increments for points", async () => {
      queryManualResultsDatabase.mockResolvedValueOnce({ rows: [manualRow] })
      const cookie = await cookieFor("admin")

      const response = await PATCH(
        buildRequest("PATCH", { cookie, body: { ...validEditBody, points: 80.5 } })
      )

      expect(response.status).toBe(200)
    })

    it("rejects a non-integer doplnovacek with 400", async () => {
      const cookie = await cookieFor("admin")

      const response = await PATCH(
        buildRequest("PATCH", { cookie, body: { ...validEditBody, doplnovacek: 2.5 } })
      )

      expect(response.status).toBe(400)
      expect(queryManualResultsDatabase).not.toHaveBeenCalled()
    })
  })
})
