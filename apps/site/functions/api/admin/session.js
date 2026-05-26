import { isAuthenticated, json } from "../../_lib/admin.js"

export const onRequestGet = async ({ request, env }) => {
  return json({ authenticated: await isAuthenticated(request, env) })
}
