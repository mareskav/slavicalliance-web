import { createSessionCookie, json, requiredEnv } from "../../_lib/admin.js"

export const onRequestPost = async ({ request, env }) => {
  try {
    const { password } = await request.json()

    const role = password && password === requiredEnv(env, "ADMIN_PASSWORD") ? "admin" : null

    if (!role) {
      return json({ error: "Invalid password" }, { status: 401 })
    }

    return json(
      { authenticated: true, role },
      {
        headers: {
          "Set-Cookie": await createSessionCookie(env, role),
        },
      },
    )
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 500 })
  }
}
