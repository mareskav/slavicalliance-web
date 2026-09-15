import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { defineConfig, devices } from "@playwright/test"

// Mirrors apps/site/scripts/dev.mjs's parseEnvFile: dev.mjs reads these same
// files itself to configure the local server, so tests read them too to get
// ADMIN_PASSWORD/CAPTAIN_PASSWORD without hardcoding or duplicating secrets.
const parseEnvFile = (filePath: string): Record<string, string> => {
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

const repoRoot = join(__dirname, "../..")
const localEnv = { ...parseEnvFile(join(repoRoot, ".env.local")), ...parseEnvFile(join(__dirname, ".env.local")) }

for (const [key, value] of Object.entries(localEnv)) {
  if (value && process.env[key] === undefined) {
    process.env[key] = value
  }
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
})
