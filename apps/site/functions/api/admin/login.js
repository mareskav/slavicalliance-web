import { createSessionCookie, json, requiredEnv } from "../../_lib/admin.js"

export const onRequestPost = async ({ request, env }) => {
  try {
    const { password } = await request.json()

    if (!password || password !== requiredEnv(env, "ADMIN_PASSWORD")) {
      return json({ error: "Invalid password" }, { status: 401 })
    }

    return json(
      { authenticated: true },
      {
        headers: {
          "Set-Cookie": await createSessionCookie(env),
        },
      },
    )
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 500 })
  }
}
