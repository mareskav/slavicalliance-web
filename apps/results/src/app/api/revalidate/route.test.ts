import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }))

vi.mock("next/cache", () => ({ revalidateTag }))

const { POST } = await import("./route")

const post = (authorization?: string) =>
  POST(
    new Request("https://slavicalliance.cz/vysledky/api/revalidate", {
      method: "POST",
      headers: authorization ? { authorization } : {}
    })
  )

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    vi.stubEnv("REVALIDATE_TOKEN", "test-token")
    revalidateTag.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("rejects requests without a token", async () => {
    expect((await post()).status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("rejects a wrong token", async () => {
    expect((await post("Bearer nope")).status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("is disabled when no token is configured", async () => {
    vi.stubEnv("REVALIDATE_TOKEN", "")
    expect((await post("Bearer test-token")).status).toBe(503)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("expires the quiz-results cache tag for a valid token", async () => {
    const response = await post("Bearer test-token")

    expect(response.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith("quiz-results", { expire: 0 })
  })
})
