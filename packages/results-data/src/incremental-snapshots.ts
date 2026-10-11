import { getTeamKey, getTeamResults, getTeamSummariesForNames, type TeamSummary } from "./quiz-results"
import {
  indexSnapshotPath,
  manifestPath,
  snapshotCacheControl,
  teamSnapshotPath,
  type ResultsIndexSnapshot
} from "./snapshot-paths"

// Minimal slice of an R2 bucket binding, so this runs in a Pages Function and in tests.
export type SnapshotBucket = {
  get(key: string): Promise<{ text(): Promise<string> } | null>
  put(
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }
  ): Promise<unknown>
  delete(key: string): Promise<unknown>
}

export type TeamIdentity = { teamId: number | null; teamName: string }

const jsonType = "application/json; charset=utf-8"

const sha256 = async (text: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

const compareTeams = (a: { teamName: string; teamId: number | null }, b: { teamName: string; teamId: number | null }) => {
  const byName = a.teamName.localeCompare(b.teamName, "cs")

  if (byName !== 0) {
    return byName
  }

  return (a.teamId ?? Number.POSITIVE_INFINITY) - (b.teamId ?? Number.POSITIVE_INFINITY)
}

// Replaces the entries for `names` in the (already sorted) teams list, keeping
// the rest of the order untouched. The DB collation may differ slightly from
// localeCompare for new names; the next full publish restores the exact order.
export const mergeTeamSummaries = (existing: TeamSummary[], names: string[], fresh: TeamSummary[]) => {
  const affected = new Set(names)
  const result: TeamSummary[] = []
  const pending = [...fresh].sort(compareTeams)

  const flushBefore = (team: TeamSummary | null) => {
    while (pending.length > 0 && (team === null || compareTeams(pending[0], team) < 0)) {
      result.push(pending.shift() as TeamSummary)
    }
  }

  for (const team of existing) {
    if (affected.has(team.teamName)) {
      continue
    }

    flushBefore(team)
    result.push(team)
  }

  flushBefore(null)
  return result
}

// Rewrites only what a manual result can change - the snapshots of the touched
// teams and their entries in index.json (league standings never include manual
// results) - so a saved result shows up without a full GitHub-Actions publish.
// Returns false when there is no index yet (the full publish will create it).
export const refreshTeamSnapshots = async (bucket: SnapshotBucket, identities: TeamIdentity[]) => {
  const unique = new Map(identities.map((identity) => [getTeamKey(identity.teamId, identity.teamName), identity]))

  if (unique.size === 0) {
    return true
  }

  const indexObject = await bucket.get(indexSnapshotPath)

  if (!indexObject) {
    return false
  }

  const names = [...new Set([...unique.values()].map((identity) => identity.teamName))]
  const [index, summaries, results] = await Promise.all([
    indexObject.text().then((text) => JSON.parse(text) as ResultsIndexSnapshot),
    getTeamSummariesForNames(names),
    Promise.all([...unique.entries()].map(async ([teamKey, identity]) => [
      teamKey,
      await getTeamResults(identity.teamId, identity.teamName)
    ] as const))
  ])

  const manifestObject = await bucket.get(manifestPath)
  const manifest = manifestObject ? (JSON.parse(await manifestObject.text()) as Record<string, string>) : null
  const liveKeys = new Set(summaries.map((summary) => summary.teamKey))

  for (const [teamKey, teamResults] of results) {
    const path = teamSnapshotPath(teamKey)

    if (teamResults.length === 0 || !liveKeys.has(teamKey)) {
      await bucket.delete(path)
      if (manifest) delete manifest[path]
      continue
    }

    const body = JSON.stringify(teamResults)
    await bucket.put(path, body, { httpMetadata: { contentType: jsonType, cacheControl: snapshotCacheControl } })
    if (manifest) manifest[path] = await sha256(body)
  }

  const nextIndex: ResultsIndexSnapshot = {
    ...index,
    generatedAt: new Date().toISOString(),
    teams: mergeTeamSummaries(index.teams, names, summaries)
  }

  await bucket.put(indexSnapshotPath, JSON.stringify(nextIndex), {
    httpMetadata: { contentType: jsonType, cacheControl: snapshotCacheControl }
  })

  if (manifest) {
    await bucket.put(manifestPath, JSON.stringify(manifest), {
      httpMetadata: { contentType: jsonType, cacheControl: "no-store" }
    })
  }

  return true
}
