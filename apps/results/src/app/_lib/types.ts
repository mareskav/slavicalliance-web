import type { LeagueStandingTeam } from "@/lib/quiz-results"

export type ResultView = "team" | "league"
export type SortDirection = "asc" | "desc"
export type TeamSortKey =
  | "date"
  | "place"
  | "points"
  | "doplnovacek"
  | "tip56"
  | "pub"
  | "maxPoints"
  | "members"
export type LeagueSortKey = "placement" | "team" | "points" | "rounds"
export type LeagueStandingDisplayTeam = LeagueStandingTeam & {
  placement: number
  displayPoints: number
  displayQuizCount: number
  displayLastQuizPoints: number | null
  displayLastQuizDate: string | null
  droppedPoints: number[]
}
