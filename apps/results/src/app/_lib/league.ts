import type { LeagueStandingTeam } from "@/lib/quiz-results"
import type { LeagueCutCount } from "./constants"
import type { LeagueStandingDisplayTeam } from "./types"

const getSelectedLeagueResults = (team: LeagueStandingTeam, selectedRoundCount: number) => {
  return team.leagueResults.slice(0, selectedRoundCount)
}

const getDroppedPoints = (
  team: LeagueStandingTeam,
  cutCount: LeagueCutCount,
  selectedRoundCount: number
) => {
  if (cutCount === 0) return []
  const selectedResults = getSelectedLeagueResults(team, selectedRoundCount)
  const missingRounds = Math.max(0, selectedRoundCount - selectedResults.length)
  const allPoints = [
    ...selectedResults.map((r) => r.points),
    ...Array<number>(missingRounds).fill(0)
  ]
  return allPoints
    .sort((a, b) => a - b)
    .slice(0, cutCount)
}

const getLeaguePoints = (
  team: LeagueStandingTeam,
  cutCount: LeagueCutCount,
  selectedRoundCount: number
) => {
  const selectedTotal = getSelectedLeagueResults(team, selectedRoundCount).reduce(
    (total, result) => total + result.points,
    0
  )
  const droppedTotal = getDroppedPoints(team, cutCount, selectedRoundCount).reduce(
    (total, points) => total + points,
    0
  )
  return selectedTotal - droppedTotal
}

export const getLeagueTeamsWithPlacements = (
  teams: LeagueStandingTeam[],
  cutCount: LeagueCutCount,
  selectedRoundCount: number
): LeagueStandingDisplayTeam[] => {
  const teamsByPoints = [...teams].sort((a, b) => {
    const compared =
      getLeaguePoints(b, cutCount, selectedRoundCount) -
      getLeaguePoints(a, cutCount, selectedRoundCount)

    if (compared !== 0) {
      return compared
    }

    return a.teamName.localeCompare(b.teamName, "cs") || a.teamKey.localeCompare(b.teamKey, "cs")
  })

  const placements = new Map<string, number>()
  let previousPoints: number | null = null
  let previousPlacement = 0

  teamsByPoints.forEach((team, index) => {
    const points = getLeaguePoints(team, cutCount, selectedRoundCount)
    const placement = previousPoints === points ? previousPlacement : index + 1
    placements.set(team.teamKey, placement)
    previousPoints = points
    previousPlacement = placement
  })

  return teams.map((team) => {
    const selectedResults = getSelectedLeagueResults(team, selectedRoundCount)
    const lastSelectedResult = selectedResults.at(-1)

    return {
      ...team,
      placement: placements.get(team.teamKey) ?? 0,
      displayPoints: getLeaguePoints(team, cutCount, selectedRoundCount),
      displayQuizCount: selectedResults.length,
      displayLastQuizPoints: lastSelectedResult?.points ?? null,
      displayLastQuizDate: lastSelectedResult?.date ?? null,
      droppedPoints: getDroppedPoints(team, cutCount, selectedRoundCount)
    }
  })
}
