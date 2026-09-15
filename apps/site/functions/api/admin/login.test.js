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

  it("logs in as captain with CAPTAIN_PASSWORD", async () => {
    const env = { ...baseEnv, CAPTAIN_PASSWORD: "captain-pw" }
    const response = await onRequestPost({ request: requestWithPassword("captain-pw"), env })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ authenticated: true, role: "captain" })
    expect(response.headers.get("Set-Cookie")).toContain("sa_admin_session=")
  })

  it("rejects a wrong password", async () => {
    const response = await onRequestPost({ request: requestWithPassword("nope"), env: baseEnv })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe("Invalid password")
  })

  it("cleanly rejects a captain login attempt when CAPTAIN_PASSWORD is unset", async () => {
    const response = await onRequestPost({ request: requestWithPassword("whatever-a-captain-might-type"), env: baseEnv })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe("Invalid password")
  })

  it("rejects an empty password", async () => {
    const response = await onRequestPost({ request: requestWithPassword(""), env: baseEnv })

    expect(response.status).toBe(401)
  })
})
