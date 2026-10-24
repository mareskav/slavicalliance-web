import type { LeagueStandingTeam } from "@repo/results-data/quiz-results"
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
  const effectiveCutCount = selectedResults.length > cutCount ? cutCount : 0
  return selectedResults
    .map((r) => r.points)
    .sort((a, b) => a - b)
    .slice(0, effectiveCutCount)
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

// Tiebreaks as applied by the official table (verified against league 499; the
// written rules list members first): the highest score from a single quiz, then
// fewer members over the counted rounds.
const getLeagueMembers = (team: LeagueStandingTeam, selectedRoundCount: number) =>
  getSelectedLeagueResults(team, selectedRoundCount).reduce((total, result) => total + (result.members ?? 0), 0)

const getBestQuizPoints = (team: LeagueStandingTeam, selectedRoundCount: number) =>
  Math.max(0, ...getSelectedLeagueResults(team, selectedRoundCount).map((result) => result.points))

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

    return (
      getBestQuizPoints(b, selectedRoundCount) - getBestQuizPoints(a, selectedRoundCount) ||
      getLeagueMembers(a, selectedRoundCount) - getLeagueMembers(b, selectedRoundCount) ||
      a.teamName.localeCompare(b.teamName, "cs") ||
      a.teamKey.localeCompare(b.teamKey, "cs")
    )
  })

  const placements = new Map<string, number>()
  let previousScore: string | null = null
  let previousPlacement = 0

  teamsByPoints.forEach((team, index) => {
    const score = [
      getLeaguePoints(team, cutCount, selectedRoundCount),
      getLeagueMembers(team, selectedRoundCount),
      getBestQuizPoints(team, selectedRoundCount)
    ].join("|")
    const placement = previousScore === score ? previousPlacement : index + 1
    placements.set(team.teamKey, placement)
    previousScore = score
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
