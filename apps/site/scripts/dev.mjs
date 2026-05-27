import net from "node:net"
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const publicHost = "localhost"
// Wrangler Pages --proxy hard-codes fetches to localhost:<port>.
const nextHost = "localhost"
const nextPort = 3002
const wranglerPort = 3000
const scriptDir = dirname(fileURLToPath(import.meta.url))
const rootEnvFile = resolve(scriptDir, "../../../.env.local")

const npmExecPath = process.env.npm_execpath
const npmCommand = npmExecPath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm"
const npmArgs = (args) => (npmExecPath ? [npmExecPath, ...args] : args)

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return new Map()
  }

  const values = new Map()

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/)

    if (!match) {
      continue
    }

    const [, key, rawValue = ""] = match
    let value = rawValue.trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    values.set(key, value)
  }

  return values
}

const rootEnv = parseEnvFile(rootEnvFile)
const wranglerEnvArgs = ["ADMIN_PASSWORD", "SESSION_SECRET"].flatMap((key) => {
  const value = rootEnv.get(key)
  return value ? [`--binding=${key}=${value}`] : []
})

const children = new Set()
let shuttingDown = false

const spawnChild = (command, args, options = {}) => {
  const child = spawn(command, args, {
    stdio: options.stdio ?? "inherit",
    shell: false,
  })

  children.add(child)

  child.on("exit", (code, signal) => {
    children.delete(child)

    if (shuttingDown || signal) {
      return
    }

    process.exitCode = code ?? 1
    shutdown()
  })

  return child
}

const shutdown = () => {
  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill()
    }
  }
}

const waitForPort = (port, hostname, timeoutMs = 30000) => {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host: hostname, port })

      socket.once("connect", () => {
        socket.end()
        resolve()
      })

      socket.once("error", () => {
        socket.destroy()

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${hostname}:${port}`))
          return
        }

        setTimeout(tryConnect, 100)
      })
    }

    tryConnect()
  })
}

const waitForHttp = async (url, timeoutMs = 30000, consecutiveOkCount = 1) => {
  const startedAt = Date.now()
  let okCount = 0

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      await response.arrayBuffer()

      if (response.ok) {
        okCount += 1

        if (okCount >= consecutiveOkCount) {
          return
        }
      } else {
        okCount = 0
      }
    } catch {
      // Next can accept TCP connections before the first route is compiled.
      okCount = 0
    }

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error(`Timed out waiting for ${url}`)
}

const warmWranglerProxy = async () => {
  await waitForHttp(`http://${publicHost}:${wranglerPort}`, 30000, 4)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
process.on("exit", shutdown)

const next = spawnChild(
  npmCommand,
  npmArgs(["run", "dev:next", "--", "--hostname", nextHost, "--port", String(nextPort)])
)

try {
  await waitForPort(nextPort, nextHost)
  await waitForHttp(`http://${nextHost}:${nextPort}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  shutdown()
  process.exit(1)
}

if (next.exitCode !== null) {
  process.exit(next.exitCode ?? 1)
}

const wrangler = spawnChild(
  npmCommand,
  npmArgs([
    "exec",
    "wrangler",
    "--",
    "pages",
    "dev",
    "--proxy",
    String(nextPort),
    "--port",
    String(wranglerPort),
    "--ip",
    publicHost,
    "--compatibility-date=2026-05-26",
    ...wranglerEnvArgs,
  ]),
  { stdio: ["inherit", "pipe", "pipe"] }
)

let wranglerOutputReady = false

wrangler.stdout.on("data", (chunk) => {
  if (wranglerOutputReady) {
    process.stdout.write(chunk)
  }
})

wrangler.stderr.on("data", (chunk) => {
  if (wranglerOutputReady) {
    process.stderr.write(chunk)
  }
})

try {
  await waitForPort(wranglerPort, publicHost)
  await warmWranglerProxy()
  wranglerOutputReady = true
  console.log(`Wrangler ready on http://${publicHost}:${wranglerPort}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  shutdown()
  process.exit(1)
}
