import { spawn } from "node:child_process"

const host = "localhost"
const port = 3000

const npmExecPath = process.env.npm_execpath
const npmCommand = npmExecPath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm"
const npmArgs = (args) => (npmExecPath ? [npmExecPath, ...args] : args)

const child = spawn(
  npmCommand,
  npmArgs(["run", "dev:next", "--", "--hostname", host, "--port", String(port)]),
  {
    stdio: "inherit",
    shell: false
  }
)

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
