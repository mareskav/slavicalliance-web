import { beforeEach, describe, expect, it, vi } from "vitest"

import type { QuizResult, TeamSummary } from "./quiz-results"

const { getTeamResults, getTeamSummariesForNames } = vi.hoisted(() => ({
  getTeamResults: vi.fn(),
  getTeamSummariesForNames: vi.fn()
}))

vi.mock("./quiz-results", () => ({
  getTeamKey: (teamId: number | null, teamName: string) =>
    teamId === null ? `name:${teamName}` : `id:${teamId}:name:${teamName}`,
  getTeamResults,
  getTeamSummariesForNames
}))

const { mergeTeamSummaries, refreshTeamSnapshots } = await import("./incremental-snapshots")
const { indexSnapshotPath, manifestPath, teamSnapshotPath } = await import("./snapshot-paths")

const summary = (teamId: number | null, teamName: string, quizCount = 1): TeamSummary => ({
  teamId,
  teamKey: teamId === null ? `name:${teamName}` : `id:${teamId}:name:${teamName}`,
  teamName,
  teamPub: null,
  quizCount,
  firstDate: "2026-01-01T00:00:00.000Z",
  lastDate: "2026-01-01T00:00:00.000Z",
  averagePoints: 1,
  bestPoints: 1,
  bestPlace: 1,
  duplicateNameCount: 1
})

const makeBucket = (initial: Record<string, string>) => {
  const store = new Map(Object.entries(initial))
  return {
    store,
    get: async (key: string) => (store.has(key) ? { text: async () => store.get(key) as string } : null),
    put: vi.fn(async (key: string, value: string) => void store.set(key, value)),
    delete: vi.fn(async (key: string) => void store.delete(key))
  }
}

describe("mergeTeamSummaries", () => {
  it("replaces an affected entry in place", () => {
    const merged = mergeTeamSummaries([summary(1, "Alfa"), summary(2, "Beta")], ["Alfa"], [summary(1, "Alfa", 5)])
    expect(merged.map((team) => [team.teamName, team.quizCount])).toEqual([["Alfa", 5], ["Beta", 1]])
  })

  it("inserts a new team in sorted position and drops a vanished one", () => {
    const merged = mergeTeamSummaries([summary(1, "Alfa"), summary(3, "Gama")], ["Beta", "Gama"], [summary(2, "Beta")])
    expect(merged.map((team) => team.teamName)).toEqual(["Alfa", "Beta"])
  })

  it("appends a team that sorts last", () => {
    const merged = mergeTeamSummaries([summary(1, "Alfa")], ["Zeta"], [summary(null, "Zeta")])
    expect(merged.map((team) => team.teamName)).toEqual(["Alfa", "Zeta"])
  })
})

describe("refreshTeamSnapshots", () => {
  beforeEach(() => {
    getTeamResults.mockReset()
    getTeamSummariesForNames.mockReset()
  })

  it("does nothing without an index", async () => {
    const bucket = makeBucket({})
    expect(await refreshTeamSnapshots(bucket, [{ teamId: 1, teamName: "Alfa" }])).toBe(false)
    expect(bucket.put).not.toHaveBeenCalled()
  })

  it("writes the team snapshot, index entry and manifest hash", async () => {
    const rows = [{ id: "m1" }] as unknown as QuizResult[]
    getTeamResults.mockResolvedValue(rows)
    getTeamSummariesForNames.mockResolvedValue([summary(1, "Alfa", 2)])
    const bucket = makeBucket({
      [indexSnapshotPath]: JSON.stringify({
        generatedAt: "old",
        lastResultDate: null,
        teams: [summary(1, "Alfa", 1)],
        leagues: [],
        specialLeagues: []
      }),
      [manifestPath]: JSON.stringify({})
    })

    expect(await refreshTeamSnapshots(bucket, [{ teamId: 1, teamName: "Alfa" }])).toBe(true)

    const path = teamSnapshotPath("id:1:name:Alfa")
    expect(JSON.parse(bucket.store.get(path) as string)).toEqual(rows)
    expect(JSON.parse(bucket.store.get(indexSnapshotPath) as string).teams[0].quizCount).toBe(2)
    expect(JSON.parse(bucket.store.get(manifestPath) as string)[path]).toMatch(/^[0-9a-f]{64}$/)
  })

  it("deletes the snapshot of a team that no longer has results", async () => {
    getTeamResults.mockResolvedValue([])
    getTeamSummariesForNames.mockResolvedValue([])
    const path = teamSnapshotPath("id:1:name:Alfa")
    const bucket = makeBucket({
      [indexSnapshotPath]: JSON.stringify({
        generatedAt: "old",
        lastResultDate: null,
        teams: [summary(1, "Alfa")],
        leagues: [],
        specialLeagues: []
      }),
      [path]: "[]",
      [manifestPath]: JSON.stringify({ [path]: "x" })
    })

    await refreshTeamSnapshots(bucket, [{ teamId: 1, teamName: "Alfa" }])

    expect(bucket.store.has(path)).toBe(false)
    expect(JSON.parse(bucket.store.get(indexSnapshotPath) as string).teams).toEqual([])
    expect(JSON.parse(bucket.store.get(manifestPath) as string)).toEqual({})
  })
})
