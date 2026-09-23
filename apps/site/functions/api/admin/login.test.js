import { describe, expect, it } from "vitest"
import { onRequestPost } from "./login.js"

const baseEnv = { ADMIN_PASSWORD: "admin-pw", SESSION_SECRET: "test-secret" }

const requestWithPassword = (password) => ({
  json: async () => ({ password })
})

describe("admin login", () => {
  it("logs in as admin with ADMIN_PASSWORD", async () => {
    const response = await onRequestPost({ request: requestWithPassword("admin-pw"), env: baseEnv })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ authenticated: true, role: "admin" })
    expect(response.headers.get("Set-Cookie")).toContain("sa_admin_session=")
  })

  it("rejects a wrong password", async () => {
    const response = await onRequestPost({ request: requestWithPassword("nope"), env: baseEnv })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe("Invalid password")
  })

  it("rejects an empty password", async () => {
    const response = await onRequestPost({ request: requestWithPassword(""), env: baseEnv })

    expect(response.status).toBe(401)
  })
})
