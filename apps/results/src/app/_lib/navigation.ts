import { defaultLeagueCutCount, leagueCutOptions } from "./constants"
import type { LeagueCutCount } from "./constants"
import type { LeagueSortKey, ResultView, SortDirection, TeamSortKey } from "./types"

const getNextSortDirection = (
  activeSort: string,
  sort: string,
  direction: SortDirection,
  defaultDirection: SortDirection
) => {
  if (activeSort !== sort) {
    return defaultDirection
  }
  return direction === "asc" ? "desc" : "asc"
}

export const getPaginationHref = (
  teamName: string,
  teamIdQuery: string | null,
  page: number,
  pageSize: number,
  sort?: TeamSortKey,
  direction?: SortDirection
) => {
  const params = new URLSearchParams({
    team: teamName,
    page: String(page),
    pageSize: String(pageSize)
  })
  if (teamIdQuery !== null) params.set("teamId", teamIdQuery)
  if (sort) params.set("sort", sort)
  if (direction) params.set("dir", direction)
  return `/?${params.toString()}`
}

export const getLeaguePaginationHref = (
  _teamName: string | undefined,
  page: number,
  pageSize: number,
  cutCount: LeagueCutCount,
  selectedRoundCount: number,
  sort?: LeagueSortKey,
  direction?: SortDirection
) => {
  const params = new URLSearchParams({
    view: "league",
    page: String(page),
    pageSize: String(pageSize)
  })
  if (cutCount !== defaultLeagueCutCount) params.set("cuts", String(cutCount))
  params.set("rounds", String(selectedRoundCount))
  if (sort) params.set("sort", sort)
  if (direction) params.set("dir", direction)
  return `/?${params.toString()}`
}

export const getLeagueCutsHref = (
  _teamName: string | undefined,
  pageSize: number,
  sort: LeagueSortKey,
  direction: SortDirection,
  cutCount: LeagueCutCount,
  selectedRoundCount: number,
  page: number
) => {
  const params = new URLSearchParams({
    view: "league",
    page: String(page),
    pageSize: String(pageSize),
    sort,
    dir: direction
  })
  if (cutCount !== defaultLeagueCutCount) params.set("cuts", String(cutCount))
  params.set("rounds", String(selectedRoundCount))
  return `/?${params.toString()}`
}

export const getViewHref = (view: ResultView, teamName?: string, teamIdQuery?: string | null) => {
  const params = new URLSearchParams()
  if (view === "league") params.set("view", view)
  if (view === "team" && teamName) {
    params.set("team", teamName)
    if (teamIdQuery !== undefined && teamIdQuery !== null) params.set("teamId", teamIdQuery)
  }
  const query = params.toString()
  return query ? `/?${query}` : "/"
}

export const getTeamSortHref = (
  teamName: string,
  teamIdQuery: string | null,
  sort: TeamSortKey,
  activeSort: TeamSortKey,
  direction: SortDirection,
  pageSize: number,
  defaultDirection: SortDirection
) => {
  const params = new URLSearchParams({
    team: teamName,
    page: "1",
    pageSize: String(pageSize),
    sort,
    dir: getNextSortDirection(activeSort, sort, direction, defaultDirection)
  })
  if (teamIdQuery !== null) params.set("teamId", teamIdQuery)
  return `/?${params.toString()}`
}

export const getLeagueSortHref = (
  _teamName: string | undefined,
  sort: LeagueSortKey,
  activeSort: LeagueSortKey,
  direction: SortDirection,
  pageSize: number,
  cutCount: LeagueCutCount,
  selectedRoundCount: number,
  defaultDirection: SortDirection
) => {
  const params = new URLSearchParams({
    view: "league",
    page: "1",
    pageSize: String(pageSize),
    sort,
    dir: getNextSortDirection(activeSort, sort, direction, defaultDirection)
  })
  if (cutCount !== defaultLeagueCutCount) params.set("cuts", String(cutCount))
  params.set("rounds", String(selectedRoundCount))
  return `/?${params.toString()}`
}

export const getVisiblePages = (currentPage: number, totalPages: number) => {
  const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
  const lastPage = Math.min(totalPages, firstPage + 4)
  return Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index)
}

export const getSortDirection = (
  value: string | undefined,
  fallback: SortDirection
): SortDirection => {
  return value === "asc" || value === "desc" ? value : fallback
}

export const getTeamSortKey = (value: string | undefined): TeamSortKey => {
  return value === "place" ||
    value === "points" ||
    value === "doplnovacek" ||
    value === "tip56" ||
    value === "pub" ||
    value === "maxPoints" ||
    value === "members"
    ? value
    : "date"
}

export const getLeagueSortKey = (value: string | undefined): LeagueSortKey => {
  return value === "placement" || value === "team" || value === "rounds" ? value : "points"
}

export const getLeagueCutCount = (value: string | undefined): LeagueCutCount => {
  const parsed = Number(value)
  return leagueCutOptions.includes(parsed as LeagueCutCount)
    ? (parsed as LeagueCutCount)
    : defaultLeagueCutCount
}

export const getLeagueSelectedRoundCount = (value: string | undefined, playedRounds: number) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    return Math.max(playedRounds, 1)
  }
  return Math.min(parsed, Math.max(playedRounds, 1))
}
