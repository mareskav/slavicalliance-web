import { beforeEach, describe, expect, it, vi } from "vitest"

// Guards two invariants that are easy to break by accident while touching
// quiz-results.ts: manual results must stay excluded from every league
// standings query, and a team's own results must keep filtering out
// soft-deleted ("rejected") manual rows. Both are load-bearing for the
// admin warning banner in ManualResultsPanel.tsx, which tells admins manual
// results show on team pages but are NOT counted into league standings.

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }))

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: queryMock,
    on: vi.fn()
  }))
}))

// Bypasses Next's request-scoped cache wrapper so every call reaches the
// underlying loader and its SQL is visible to queryMock.
vi.mock("next/cache", () => ({
  unstable_cache:
    <Args extends unknown[], Result>(fn: (...args: Args) => Promise<Result>) =>
    (...args: Args) =>
      fn(...args)
}))

const fakeLeagueRow = {
  id: 1,
  league_name: "Finále Praha",
  period_start: new Date("2026-01-01T00:00:00.000Z"),
  period_stop: new Date("2026-03-01T00:00:00.000Z"),
  league_url: "https://www.hospodskykviz.cz/vysledky/461"
}

// Every league-lookup query (against public.quiz_leagues) resolves to a
// single fake league; every other query (standings rows, total pubs, etc.)
// resolves to an empty result set. This exercises the full standings code
// path - including the per-league rows/total-pubs queries - rather than
// short-circuiting on the early "league not found" branch.
queryMock.mockImplementation(async (text: string) => {
  if (text.includes("from public.quiz_leagues")) {
    return { rows: [fakeLeagueRow] }
  }

  return { rows: [] }
})

const {
  getTeamResults,
  getPrahaLeagueSummaries,
  getLongTermLeagueStandings,
  getSpecialLeagueSummaries,
  getSpecialLeagueStandings
} = await import("./quiz-results")

beforeEach(() => {
  queryMock.mockClear()
  vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db")
})

const allQueriedSql = () => queryMock.mock.calls.map(([text]) => String(text))

describe("getTeamResults", () => {
  it("filters out rejected (soft-deleted) manual results", async () => {
    await getTeamResults(42, "Slavic Alliance")

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql] = queryMock.mock.calls[0]
    expect(sql).toContain("from public.quiz_manual_results")
    expect(sql).toContain("status <> 'rejected'")
  })
})

describe("league standings never include manual results", () => {
  it("getPrahaLeagueSummaries never references quiz_manual_results", async () => {
    await getPrahaLeagueSummaries()

    expect(allQueriedSql().some((sql) => sql.includes("quiz_manual_results"))).toBe(false)
  })

  it("getLongTermLeagueStandings never references quiz_manual_results", async () => {
    await getLongTermLeagueStandings()

    expect(allQueriedSql().some((sql) => sql.includes("quiz_manual_results"))).toBe(false)
  })

  it("getSpecialLeagueSummaries never references quiz_manual_results", async () => {
    await getSpecialLeagueSummaries()

    expect(allQueriedSql().some((sql) => sql.includes("quiz_manual_results"))).toBe(false)
  })

  it("getSpecialLeagueStandings never references quiz_manual_results", async () => {
    await getSpecialLeagueStandings()

    expect(allQueriedSql().some((sql) => sql.includes("quiz_manual_results"))).toBe(false)
  })

  it("getLongTermLeagueStandings actually exercises the standings-row and total-pubs queries", async () => {
    // Sanity check that the fake league row was accepted (not an early
    // return on "league not found"), so the assertion above is meaningful
    // rather than vacuous.
    await getLongTermLeagueStandings()

    const sql = allQueriedSql()
    expect(sql.some((text) => text.includes("results_in_league"))).toBe(true)
    expect(sql.some((text) => text.includes("total_pubs"))).toBe(true)
  })
})
