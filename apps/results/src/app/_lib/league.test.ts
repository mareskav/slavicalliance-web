import { describe, expect, it } from "vitest"
import type { LeagueStandingTeam } from "@/lib/quiz-results"
import { getLeagueTeamsWithPlacements } from "./league"

const team = (points: number[]): LeagueStandingTeam => ({
  teamId: 1,
  teamKey: points.join("-") || "empty",
  teamName: "Test Team",
  teamPub: null,
  duplicateNameCount: 0,
  leagueResults: points.map((p, index) => ({
    round: index + 1,
    points: p,
    date: new Date(2026, 0, index + 1).toISOString()
  }))
})

describe("getLeagueTeamsWithPlacements", () => {
  it("does not drop a team's only played results early in the season", () => {
    const [result] = getLeagueTeamsWithPlacements([team([10, 20])], 3, 2)

    expect(result.displayPoints).toBe(30)
    expect(result.droppedPoints).toEqual([])
  })

  it("cuts worst results once a team has played more rounds than the cut count", () => {
    const [result] = getLeagueTeamsWithPlacements([team([10, 20, 30, 40])], 3, 4)

    expect(result.droppedPoints).toEqual([10, 20, 30])
    expect(result.displayPoints).toBe(40)
  })
})
