import { getSession, json } from "../../_lib/admin.js"

export const onRequestGet = async ({ request, env }) => {
  const session = await getSession(request, env)
  return json({ authenticated: session !== null, role: session?.role ?? null })
}
