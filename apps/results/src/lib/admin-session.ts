const sessionCookieName = "sa_admin_session"

export type AdminSessionRole = "admin" | "captain"
export type AdminSession = { role: AdminSessionRole; exp: number }

const base64UrlEncode = (input: string) =>
  btoa(input).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")

const base64UrlDecode = (input: string) => {
  const padded = input
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=")
  return atob(padded)
}

const hmac = async (secret: string, value: string) => {
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

const parseCookies = (request: Request) => {
  const header = request.headers.get("Cookie") || ""
  const cookies = new Map<string, string>()

  for (const part of header.split(";")) {
    const [name, ...value] = part.trim().split("=")

    if (name) {
      cookies.set(name, value.join("="))
    }
  }

  return cookies
}

// Ported from apps/site/functions/_lib/admin.js. Cookie name, payload shape
// and HMAC algorithm must stay byte-for-byte identical so a cookie issued by
// apps/site verifies correctly here.
export const getAdminSession = async (request: Request): Promise<AdminSession | null> => {
  const secret = process.env.SESSION_SECRET?.trim()

  if (!secret) {
    return null
  }

  const token = parseCookies(request).get(sessionCookieName)

  if (!token) {
    return null
  }

  const [payload, signature] = token.split(".")

  if (!payload || !signature) {
    return null
  }

  const expected = await hmac(secret, payload)

  if (signature !== expected) {
    return null
  }

  const session = JSON.parse(base64UrlDecode(payload)) as { role?: unknown; exp?: unknown }

  if (session.role !== "admin" && session.role !== "captain") {
    return null
  }

  if (typeof session.exp !== "number" || session.exp <= Math.floor(Date.now() / 1000)) {
    return null
  }

  return { role: session.role, exp: session.exp }
}
