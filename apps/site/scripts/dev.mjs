import { createHmac, timingSafeEqual } from "node:crypto"
import { createServer } from "node:http"
import { connect } from "node:net"
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const host = "localhost"
const publicPort = Number(process.env.PORT || 3000)
const nextPort = Number(process.env.NEXT_PORT || (publicPort === 3000 ? 3002 : publicPort + 1))
const siteRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = join(siteRoot, "../..")
const sessionCookieName = "sa_admin_session"
const sessionMaxAgeSeconds = 60 * 60 * 8

const npmExecPath = process.env.npm_execpath
const npmCommand = npmExecPath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm"
const npmArgs = (args) => (npmExecPath ? [npmExecPath, ...args] : args)

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return {}
  }

  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=")
        const key = line.slice(0, separator).trim()
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^"(.*)"$/, "$1")
          .replace(/^'(.*)'$/, "$1")

        return [key, value]
      })
  )
}

const localEnv = {
  ...parseEnvFile(join(repoRoot, ".env.local")),
  ...parseEnvFile(join(siteRoot, ".env.local")),
  ...process.env,
}

for (const [key, value] of Object.entries(localEnv)) {
  if (value && process.env[key] === undefined) {
    process.env[key] = value
  }
}

const json = (response, payload, init = {}) => {
  const body = JSON.stringify(payload)

  response.writeHead(init.status || 200, {
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json; charset=utf-8",
    ...init.headers,
  })
  response.end(body)
}

const readRequestBody = async (request) => {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

const readJsonBody = async (request) => {
  const body = await readRequestBody(request)
  return body.length ? JSON.parse(body.toString("utf8")) : {}
}

const parseCookies = (request) => {
  const cookies = new Map()

  for (const part of String(request.headers.cookie || "").split(";")) {
    const [name, ...value] = part.trim().split("=")

    if (name) {
      cookies.set(name, value.join("="))
    }
  }

  return cookies
}

const requiredEnv = (key) => {
  const value = localEnv[key]

  if (!value) {
    throw new Error(`Missing ${key} in .env.local`)
  }

  return value
}

const sign = (value) =>
  createHmac("sha256", requiredEnv("SESSION_SECRET")).update(value).digest("base64url")

const createSessionCookie = () => {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url")
  const signature = sign(payload)

  return `${sessionCookieName}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}`
}

const clearSessionCookie = `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`

const isAuthenticated = (request) => {
  const token = parseCookies(request).get(sessionCookieName)

  if (!token) {
    return false
  }

  const [payload, signature] = token.split(".")

  if (!payload || !signature) {
    return false
  }

  const expected = sign(payload)
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return false
  }

  const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
  return typeof session.exp === "number" && session.exp > Math.floor(Date.now() / 1000)
}

const parseMarkdown = (raw) => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const data = {}
  let content = raw

  if (match) {
    content = raw.slice(match[0].length)
    for (const line of match[1].split(/\r?\n/)) {
      const separator = line.indexOf(":")
      if (separator === -1) continue

      const key = line.slice(0, separator).trim()
      const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "")
      if (key) data[key] = value
    }
  }

  return { data, content }
}

const slugPath = (slug) => {
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return null
  }

  return join(siteRoot, "contents/pages", `${slug}.md`)
}

const pageFromMarkdown = (slug, raw) => {
  const { data, content } = parseMarkdown(raw)

  return {
    slug,
    title: String(data.title || "Slavic Alliance"),
    content,
    raw,
  }
}

const handleLocalApi = async (request, response, pathname) => {
  if (request.method === "GET" && pathname === "/api/admin/session") {
    json(response, { authenticated: isAuthenticated(request) })
    return true
  }

  if (request.method === "POST" && pathname === "/api/admin/login") {
    const { password } = await readJsonBody(request)

    if (!password || password !== requiredEnv("ADMIN_PASSWORD")) {
      json(response, { error: "Invalid password" }, { status: 401 })
      return true
    }

    json(response, { authenticated: true }, { headers: { "Set-Cookie": createSessionCookie() } })
    return true
  }

  if (request.method === "POST" && pathname === "/api/admin/logout") {
    json(response, { authenticated: false }, { headers: { "Set-Cookie": clearSessionCookie } })
    return true
  }

  const contentMatch = pathname.match(/^\/api\/content\/pages\/([^/]+)$/)
  if (request.method === "GET" && contentMatch) {
    const filePath = slugPath(contentMatch[1])

    if (!filePath) {
      json(response, { error: "Invalid slug." }, { status: 400 })
      return true
    }

    const raw = await readFile(filePath, "utf8")
    json(response, pageFromMarkdown(contentMatch[1], raw))
    return true
  }

  const adminContentMatch = pathname.match(/^\/api\/admin\/content\/pages\/([^/]+)$/)
  if (request.method === "PUT" && adminContentMatch) {
    if (!isAuthenticated(request)) {
      json(response, { error: "Unauthorized" }, { status: 401 })
      return true
    }

    const filePath = slugPath(adminContentMatch[1])

    if (!filePath) {
      json(response, { error: "Invalid slug." }, { status: 400 })
      return true
    }

    const { raw } = await readJsonBody(request)

    if (!raw) {
      json(response, { error: "Missing raw Markdown." }, { status: 400 })
      return true
    }

    await writeFile(filePath, raw, "utf8")
    json(response, pageFromMarkdown(adminContentMatch[1], raw))
    return true
  }

  return false
}

const proxyToNext = async (request, response) => {
  const target = new URL(request.url || "/", `http://${host}:${nextPort}`)
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await readRequestBody(request)
  const headers = new Headers(request.headers)
  headers.set("host", `${host}:${nextPort}`)
  headers.set("x-forwarded-host", `${host}:${publicPort}`)
  headers.set("x-forwarded-proto", "http")

  const nextResponse = await fetch(target, {
    body,
    headers,
    method: request.method,
    redirect: "manual",
  })
  const responseHeaders = Object.fromEntries(nextResponse.headers)
  delete responseHeaders["content-encoding"]
  delete responseHeaders["content-length"]
  delete responseHeaders["transfer-encoding"]

  response.writeHead(nextResponse.status, responseHeaders)
  response.end(Buffer.from(await nextResponse.arrayBuffer()))
}

const proxyUpgradeToNext = (request, socket, head) => {
  const nextSocket = connect(nextPort, host, () => {
    nextSocket.write(
      `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n` +
        Object.entries({
          ...request.headers,
          host: `${host}:${nextPort}`,
          "x-forwarded-host": `${host}:${publicPort}`,
          "x-forwarded-proto": "http",
        })
          .map(([key, value]) =>
            Array.isArray(value) ? `${key}: ${value.join(", ")}` : `${key}: ${value}`
          )
          .join("\r\n") +
        "\r\n\r\n"
    )

    if (head.length) {
      nextSocket.write(head)
    }

    socket.pipe(nextSocket)
    nextSocket.pipe(socket)
  })

  nextSocket.on("error", () => socket.destroy())
  socket.on("error", () => nextSocket.destroy())
}

const terminate = (processToStop) => {
  if (processToStop.killed) {
    return
  }

  if (process.platform === "win32" && processToStop.pid) {
    spawn("taskkill.exe", ["/pid", String(processToStop.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    })
    return
  }

  processToStop.kill()
}

const next = spawn(
  npmCommand,
  npmArgs(["run", "dev:next", "--", "--hostname", host, "--port", String(nextPort)]),
  {
    stdio: "inherit",
    shell: false,
  }
)

const server = createServer(async (request, response) => {
  try {
    const { pathname } = new URL(request.url || "/", `http://${host}:${publicPort}`)

    if (await handleLocalApi(request, response, pathname)) {
      return
    }

    await proxyToNext(request, response)
  } catch (error) {
    json(
      response,
      { error: error instanceof Error ? error.message : "Local dev server failed." },
      { status: 500 }
    )
  }
})

server.on("error", (error) => {
  terminate(next)

  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${publicPort} is already in use. Stop the existing dev server first.`)
    process.exit(1)
  }

  throw error
})

server.on("upgrade", proxyUpgradeToNext)

server.listen(publicPort, host, () => {
  console.log(`Local site dev server ready on http://${host}:${publicPort}`)
  console.log(`Next dev server proxied from http://${host}:${nextPort}`)
})

next.on("exit", (code, signal) => {
  if (signal) {
    return
  }

  server.close(() => process.exit(code ?? 1))
})

const shutdown = () => {
  server.close()
  terminate(next)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
