const sessionCookieName = "sa_admin_session"
const sessionMaxAgeSeconds = 60 * 60 * 8

const json = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers
    }
  })

const requiredEnv = (env, key) => {
  const value = env[key]

  if (!value) {
    throw new Error(`Missing ${key}`)
  }

  return value
}

const base64UrlEncode = (input) =>
  btoa(input).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")

const base64UrlDecode = (input) => {
  const padded = input
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=")
  return atob(padded)
}

const hmac = async (secret, value) => {
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

const parseCookies = (request) => {
  const header = request.headers.get("Cookie") || ""
  const cookies = new Map()

  for (const part of header.split(";")) {
    const [name, ...value] = part.trim().split("=")

    if (name) {
      cookies.set(name, value.join("="))
    }
  }

  return cookies
}

const createSessionCookie = async (env) => {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds
  const payload = base64UrlEncode(JSON.stringify({ exp: expiresAt }))
  const signature = await hmac(requiredEnv(env, "SESSION_SECRET"), payload)

  return `${sessionCookieName}=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}`
}

const clearSessionCookie = `${sessionCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

const isAuthenticated = async (request, env) => {
  const token = parseCookies(request).get(sessionCookieName)

  if (!token) {
    return false
  }

  const [payload, signature] = token.split(".")

  if (!payload || !signature) {
    return false
  }

  const expected = await hmac(requiredEnv(env, "SESSION_SECRET"), payload)

  if (signature !== expected) {
    return false
  }

  const session = JSON.parse(base64UrlDecode(payload))
  return typeof session.exp === "number" && session.exp > Math.floor(Date.now() / 1000)
}

export { clearSessionCookie, createSessionCookie, isAuthenticated, json, requiredEnv }
