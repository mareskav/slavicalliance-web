import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

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

for (const [key, value] of parseEnvFile(rootEnvFile)) {
  if (value && !process.env[key]) {
    process.env[key] = value
  }
}

const child = spawn(npmCommand, npmArgs(["run", "dev:next"]), {
  stdio: "inherit",
  shell: false,
})

child.on("exit", (code, signal) => {
  if (signal) {
    return
  }

  process.exit(code ?? 1)
})

const shutdown = () => {
  if (!child.killed) {
    child.kill()
  }
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
