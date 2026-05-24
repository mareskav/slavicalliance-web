import { spawn } from "node:child_process"

const commands = [
  { name: "site", args: ["--workspace", "apps/site", "run", "dev"] },
  { name: "results", args: ["--workspace", "apps/results", "run", "dev"] },
]

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
const children = commands.map((command) => {
  const child = spawn(npmCommand, command.args, {
    stdio: "inherit",
    shell: false,
  })

  child.on("exit", (code, signal) => {
    if (signal) {
      return
    }

    process.exitCode = code ?? 1
    for (const runningChild of children) {
      if (runningChild !== child && !runningChild.killed) {
        runningChild.kill()
      }
    }
  })

  return child
})

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill()
    }
  }
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
