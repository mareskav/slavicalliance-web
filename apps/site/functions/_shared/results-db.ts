import {
  refreshTeamSnapshots,
  type SnapshotBucket,
  type TeamIdentity
} from "../../../../packages/results-data/src/incremental-snapshots"
import { isAdmin, getSession, json } from "../_lib/admin.js"

export interface ResultsEnv {
  DATABASE_URL?: string
  DATABASE_URL_RW?: string
  SESSION_SECRET?: string
  // Fine-grained token with Actions: write on GITHUB_REPO, used to republish snapshots.
  GITHUB_DISPATCH_TOKEN?: string
  GITHUB_REPO?: string
  // Public results snapshots bucket (served from data.slavicalliance.cz).
  RESULTS_DATA_BUCKET?: SnapshotBucket
}

// The shared results-data package reads connection strings from process.env,
// which Pages Functions (nodejs_compat) don't populate from bindings.
export const applyDbEnv = (env: ResultsEnv) => {
  process.env.DATABASE_URL ??= env.DATABASE_URL
  process.env.DATABASE_URL_RW ??= env.DATABASE_URL_RW
}

// Same-origin check for write routes; a missing Origin passes since SameSite=Lax
// cookies already keep cross-site requests from carrying the session.
export const isOriginAllowed = (request: Request) => {
  const origin = request.headers.get("Origin")

  return !origin || origin.replace(/\/$/, "") === new URL(request.url).origin
}

// Asks GitHub Actions to republish the results snapshots after a write. Best
// effort: the data is already saved, and the scheduled publish catches up anyway.
export const requestSnapshotPublish = async (env: ResultsEnv) => {
  if (!env.GITHUB_DISPATCH_TOKEN) {
    return
  }

  const repo = env.GITHUB_REPO || "mareskav/slavicalliance-web"

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/publish-results.yml/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        "User-Agent": "slavicalliance-site",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({ ref: "main" })
    })

    if (!response.ok) {
      console.error("Snapshot publish dispatch failed:", response.status)
    }
  } catch (error) {
    console.error("Snapshot publish dispatch error:", error)
  }
}

// After a manual-result write: patch the touched teams' snapshots right away so
// the admin sees the result as soon as the response arrives. Awaitable, never throws.
// The full publish (requestSnapshotPublish, queued via waitUntil by the caller)
// later corrects anything the patch cannot, e.g. collation-dependent ordering.
export const refreshSnapshotsNow = async (env: ResultsEnv, identities: TeamIdentity[]) => {
  if (!env.RESULTS_DATA_BUCKET) {
    return
  }

  try {
    applyDbEnv(env)
    await refreshTeamSnapshots(env.RESULTS_DATA_BUCKET, identities)
  } catch (error) {
    console.error("Incremental snapshot refresh failed:", error)
  }
}

export { getSession, isAdmin, json }
