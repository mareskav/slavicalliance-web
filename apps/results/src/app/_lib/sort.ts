import type { QuizResult } from "@/lib/quiz-results"
import type { LeagueStandingDisplayTeam, LeagueSortKey, SortDirection, TeamSortKey } from "./types"

const applyDirection = (value: number, direction: SortDirection) =>
  direction === "asc" ? value : -value

const compareNullableNumbers = (a: number | null, b: number | null, direction: SortDirection) => {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return applyDirection(a - b, direction)
}

export const sortTeamResults = (
  results: QuizResult[],
  sort: TeamSortKey,
  direction: SortDirection
) => {
  return [...results].sort((a, b) => {
    const compared =
      sort === "date"
        ? new Date(a.quizDate).getTime() - new Date(b.quizDate).getTime()
        : sort === "place"
          ? compareNullableNumbers(a.orderInQuiz, b.orderInQuiz, direction)
          : sort === "points"
            ? compareNullableNumbers(a.points, b.points, direction)
            : sort === "doplnovacek"
              ? compareNullableNumbers(a.doplnovacek, b.doplnovacek, direction)
              : sort === "members"
                ? compareNullableNumbers(a.clenu, b.clenu, direction)
                : sort === "maxPoints"
                  ? compareNullableNumbers(a.maxBodyVKole, b.maxBodyVKole, direction)
                  : sort === "tip56"
                    ? (a.tip56Question ?? "").localeCompare(b.tip56Question ?? "", "cs")
                    : (a.pub ?? "").localeCompare(b.pub ?? "", "cs")

    if (compared !== 0) {
      return sort === "pub" || sort === "tip56" || sort === "date"
        ? applyDirection(compared, direction)
        : compared
    }

    return new Date(b.quizDate).getTime() - new Date(a.quizDate).getTime()
  })
}

export const sortLeagueTeams = <Team extends LeagueStandingDisplayTeam>(
  teams: Team[],
  sort: LeagueSortKey,
  direction: SortDirection
) => {
  return [...teams].sort((a, b) => {
    const compared =
      sort === "placement"
        ? a.placement - b.placement
        : sort === "team"
          ? a.teamName.localeCompare(b.teamName, "cs") || a.teamKey.localeCompare(b.teamKey, "cs")
          : sort === "rounds"
            ? a.displayQuizCount - b.displayQuizCount
            : a.displayPoints - b.displayPoints

    if (compared !== 0) {
      return applyDirection(compared, direction)
    }

    return a.teamName.localeCompare(b.teamName, "cs") || a.teamKey.localeCompare(b.teamKey, "cs")
  })
}
