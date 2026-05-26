const sessionCookieName = "sa_admin_session"
const sessionMaxAgeSeconds = 60 * 60 * 8
const allowedPaths = new Set(["apps/site/contents/pages/landing.md"])

const json = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers,
    },
  })

const requiredEnv = (env, key) => {
  const value = env[key]

  if (!value) {
    throw new Error(`Missing ${key}`)
  }

  return value
}

const base64UrlEncode = (input) => btoa(input).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")

const base64UrlDecode = (input) => {
  const padded = input.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(input.length / 4) * 4, "=")
  return atob(padded)
}

const bytesToBase64 = (bytes) => {
  let binary = ""
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize))
  }

  return btoa(binary)
}

const base64ToText = (input) => {
  const binary = atob(input.replace(/\s/g, ""))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const textToBase64 = (input) => bytesToBase64(new TextEncoder().encode(input))

const hmac = async (secret, value) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
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

const getGitHubConfig = (env) => ({
  token: requiredEnv(env, "GITHUB_TOKEN"),
  owner: env.GITHUB_OWNER || "mareskav",
  repo: env.GITHUB_REPO || "slavicalliance-web",
  branch: env.GITHUB_BRANCH || "main",
  committerName: env.GITHUB_COMMITTER_NAME || "Slavic Alliance Admin",
  committerEmail: env.GITHUB_COMMITTER_EMAIL || "admin@slavicalliance.local",
})

const assertAllowedPath = (path) => {
  if (!allowedPaths.has(path)) {
    throw new Error("Path is not allowed")
  }
}

const githubRequest = async (env, path, init = {}) => {
  const config = getGitHubConfig(env)
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}`
  const { search = `?ref=${encodeURIComponent(config.branch)}`, ...requestInit } = init
  const response = await fetch(`${url}${search}`, {
    ...requestInit,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "User-Agent": "slavic-alliance-admin",
      "X-GitHub-Api-Version": "2022-11-28",
      ...requestInit.headers,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message || `GitHub API error ${response.status}`)
  }

  return { payload, config }
}

const readGitHubFile = async (env, path) => {
  assertAllowedPath(path)
  const { payload } = await githubRequest(env, path)
  return {
    path,
    sha: payload.sha,
    content: base64ToText(payload.content || ""),
  }
}

const writeGitHubFile = async (env, path, content, sha) => {
  assertAllowedPath(path)
  const config = getGitHubConfig(env)
  const current = sha || (await readGitHubFile(env, path)).sha
  const { payload } = await githubRequest(env, path, {
    method: "PUT",
    search: "",
    body: JSON.stringify({
      message: `Update ${path}`,
      content: textToBase64(content),
      sha: current,
      branch: config.branch,
      committer: {
        name: config.committerName,
        email: config.committerEmail,
      },
    }),
  })

  return {
    path,
    sha: payload.content?.sha || current,
    commit: payload.commit?.sha,
  }
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

export {
  clearSessionCookie,
  createSessionCookie,
  isAuthenticated,
  json,
  readGitHubFile,
  requiredEnv,
  writeGitHubFile,
}
