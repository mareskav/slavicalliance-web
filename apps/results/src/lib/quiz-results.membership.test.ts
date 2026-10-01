import { beforeEach, describe, expect, it, vi } from "vitest"

// League membership (public.quiz_league_teams) is the only thing keeping teams
// from other regions out of a league: the SQL must bind the league url as $3,
// and an unreadable table must degrade to the old unfiltered standings instead
// of failing the page.

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }))

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: queryMock,
    on: vi.fn()
  }))
}))

vi.mock("next/cache", () => ({
  unstable_cache:
    <Args extends unknown[], Result>(fn: (...args: Args) => Promise<Result>) =>
    (...args: Args) =>
      fn(...args)
}))

const leagueUrl = "https://www.hospodskykviz.cz/vysledky/499"

const leagueRow = (url: string | null) => ({
  id: 178,
  league_name: "Praha a střední Čechy podzim 2026",
  period_start: new Date("2026-09-14T00:00:00.000Z"),
  period_stop: new Date("2027-01-31T00:00:00.000Z"),
  league_url: url
})

const standingsCalls = () =>
  queryMock.mock.calls.filter(([text]) => String(text).includes("results_in_league"))
const totalPubsCalls = () => queryMock.mock.calls.filter(([text]) => String(text).includes("total_pubs"))

const mockDatabase = (options: { url?: string | null; failMembershipWith?: string } = {}) => {
  const url = options.url === undefined ? leagueUrl : options.url

  queryMock.mockImplementation(async (text: string, values?: unknown[]) => {
    const sql = String(text)

    if (sql.includes("from public.quiz_leagues")) {
      return { rows: [leagueRow(url)] }
    }

    if (options.failMembershipWith && sql.includes("public.quiz_league_teams")) {
      throw Object.assign(new Error("membership unreadable"), { code: options.failMembershipWith })
    }

    void values
    return { rows: [] }
  })
}

const { getTeamResults, getLongTermLeagueStandings } = await import("./quiz-results")

beforeEach(() => {
  queryMock.mockReset()
  vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db")
})

describe("league membership filter", () => {
  it("binds the league url as $3 in the standings and total pubs queries", async () => {
    mockDatabase()

    await getLongTermLeagueStandings("178")

    const [[standingsSql, standingsValues]] = standingsCalls()
    expect(standingsSql).toContain("public.quiz_league_teams")
    expect(standingsSql).toContain("league_url = $3")
    expect(standingsValues).toEqual([expect.any(Date), expect.any(Date), leagueUrl])

    const [[pubsSql, pubsValues]] = totalPubsCalls()
    expect(pubsSql).toContain("league_url = $3")
    expect(pubsValues).toEqual([expect.any(Date), expect.any(Date), leagueUrl])
  })

  it("drops rows whose pub belongs to a same-named team in another league", async () => {
    mockDatabase()

    await getLongTermLeagueStandings("178")

    const [[standingsSql]] = standingsCalls()
    expect(standingsSql).toContain("other.league_url <> $3")
    expect(standingsSql).toContain("regexp_replace(trim(other.pub)")
    expect(standingsSql).toContain("regexp_replace(trim(member.pub)")
  })

  it.each(["42P01", "42501"])("falls back to unfiltered standings on error %s", async (code) => {
    mockDatabase({ failMembershipWith: code })
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    const standings = await getLongTermLeagueStandings("178")

    expect(standings).not.toBeNull()
    const calls = standingsCalls()
    expect(calls).toHaveLength(2)
    expect(calls[1][0]).not.toContain("quiz_league_teams")
    expect(calls[1][1]).toHaveLength(2)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(code))
    warn.mockRestore()
  })

  it("does not swallow other database errors", async () => {
    mockDatabase({ failMembershipWith: "22P02" })

    await expect(getLongTermLeagueStandings("178")).rejects.toThrow("membership unreadable")
  })

  it("stays unfiltered for a league without a url", async () => {
    mockDatabase({ url: null })

    await getLongTermLeagueStandings("178")

    const [[standingsSql, standingsValues]] = standingsCalls()
    expect(standingsSql).not.toContain("quiz_league_teams")
    expect(standingsValues).toHaveLength(2)
  })
})

describe("getTeamResults", () => {
  it("matches a team by id and name, and treats a missing id as null", async () => {
    mockDatabase()

    await getTeamResults(169, "Mozartovy koule")
    await getTeamResults(null, "Slavic Alliance")

    const [first, second] = queryMock.mock.calls
    expect(first[0]).toContain("team_name = $2")
    expect(first[0]).toContain("team_id is not distinct from $1::integer")
    expect(first[1]).toEqual([169, "Mozartovy koule"])
    expect(second[1]).toEqual([null, "Slavic Alliance"])
  })
})
