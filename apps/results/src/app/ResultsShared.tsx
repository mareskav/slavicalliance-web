import Link from "next/link"
import type { ReactNode } from "react"
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Trophy, Users } from "lucide-react"

import type { LeagueStandingTeam, QuizResult } from "@/lib/quiz-results"

export const pageSizeOptions = [20, 50, 100]
export const leagueCutOptions = [0, 1, 2] as const
export const defaultLeagueCutCount = 2
export type LeagueCutCount = (typeof leagueCutOptions)[number]

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

const dateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "long",
  year: "numeric"
})

const compactDateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric"
})

export const formatDate = (value: string) => dateFormatter.format(new Date(value))
export const formatCompactDate = (value: string) =>
  compactDateFormatter.format(new Date(value)).replace(/\s/g, "")

export const formatNumber = (value: number | null) => {
  if (value === null) {
    return "-"
  }

  return new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(value)
}

export const formatDroppedPoints = (values: number[]) => {
  if (values.length === 0) {
    return "-"
  }

  return values.map(formatNumber).join(" + ")
}

export const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}

export const getPaginationHref = (
  teamName: string,
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

  if (sort) {
    params.set("sort", sort)
  }

  if (direction) {
    params.set("dir", direction)
  }

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

  if (cutCount !== defaultLeagueCutCount) {
    params.set("cuts", String(cutCount))
  }

  params.set("rounds", String(selectedRoundCount))

  if (sort) {
    params.set("sort", sort)
  }

  if (direction) {
    params.set("dir", direction)
  }

  return `/?${params.toString()}`
}

export const getLeagueCutsHref = (
  _teamName: string | undefined,
  pageSize: number,
  sort: LeagueSortKey,
  direction: SortDirection,
  cutCount: LeagueCutCount,
  selectedRoundCount: number
) => {
  const params = new URLSearchParams({
    view: "league",
    page: "1",
    pageSize: String(pageSize),
    sort,
    dir: direction
  })

  if (cutCount !== defaultLeagueCutCount) {
    params.set("cuts", String(cutCount))
  }

  params.set("rounds", String(selectedRoundCount))

  return `/?${params.toString()}`
}

export const getViewHref = (view: ResultView, teamName?: string) => {
  const params = new URLSearchParams()

  if (view === "league") {
    params.set("view", view)
  }

  if (view === "team" && teamName) {
    params.set("team", teamName)
  }

  const query = params.toString()
  return query ? `/?${query}` : "/"
}

export const getTeamSortHref = (
  teamName: string,
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

  if (cutCount !== defaultLeagueCutCount) {
    params.set("cuts", String(cutCount))
  }

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

const compareNullableNumbers = (a: number | null, b: number | null, direction: SortDirection) => {
  if (a === null && b === null) {
    return 0
  }

  if (a === null) {
    return 1
  }

  if (b === null) {
    return -1
  }

  return applyDirection(a - b, direction)
}

const applyDirection = (value: number, direction: SortDirection) =>
  direction === "asc" ? value : -value

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

const getDroppedPoints = (
  team: LeagueStandingTeam,
  cutCount: LeagueCutCount,
  selectedRoundCount: number
) => {
  if (cutCount === 0) {
    return []
  }

  return team.leagueResults
    .filter((result) => result.round <= selectedRoundCount)
    .map((result) => result.points)
    .sort((a, b) => a - b)
    .slice(0, cutCount)
}

const getSelectedLeagueResults = (team: LeagueStandingTeam, selectedRoundCount: number) => {
  return team.leagueResults.filter((result) => result.round <= selectedRoundCount)
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

    return a.teamName.localeCompare(b.teamName, "cs")
  })

  const placements = new Map<string, number>()
  let previousPoints: number | null = null
  let previousPlacement = 0

  teamsByPoints.forEach((team, index) => {
    const points = getLeaguePoints(team, cutCount, selectedRoundCount)
    const placement = previousPoints === points ? previousPlacement : index + 1

    placements.set(team.teamName, placement)
    previousPoints = points
    previousPlacement = placement
  })

  return teams.map((team) => {
    const selectedResults = getSelectedLeagueResults(team, selectedRoundCount)
    const lastSelectedResult = selectedResults.at(-1)

    return {
      ...team,
      placement: placements.get(team.teamName) ?? 0,
      displayPoints: getLeaguePoints(team, cutCount, selectedRoundCount),
      displayQuizCount: selectedResults.length,
      displayLastQuizPoints: lastSelectedResult?.points ?? null,
      displayLastQuizDate: lastSelectedResult?.date ?? null,
      droppedPoints: getDroppedPoints(team, cutCount, selectedRoundCount)
    }
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
          ? a.teamName.localeCompare(b.teamName, "cs")
          : sort === "rounds"
            ? a.displayQuizCount - b.displayQuizCount
            : a.displayPoints - b.displayPoints

    if (compared !== 0) {
      return applyDirection(compared, direction)
    }

    return a.teamName.localeCompare(b.teamName, "cs")
  })
}

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

const SortIndicator = ({
  isActive,
  direction
}: {
  isActive: boolean
  direction: SortDirection
}) => {
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown

  return (
    <Icon
      className={`h-3.5 w-3.5 ${isActive ? "text-sky-100/86" : "text-white/28"}`}
      aria-hidden="true"
    />
  )
}

export const SortHeader = ({
  href,
  label,
  title,
  align = "left",
  isActive,
  direction
}: {
  href: string
  label: ReactNode
  title?: string
  align?: "left" | "right"
  isActive: boolean
  direction: SortDirection
}) => (
  <Link
    href={href}
    title={title}
    aria-label={title}
    className={`inline-flex w-full items-center gap-1.5 transition hover:text-white ${align === "right" ? "justify-end" : "justify-start"}`}
  >
    <span>{label}</span>
    <SortIndicator isActive={isActive} direction={direction} />
  </Link>
)

export const StatCard = ({
  label,
  value,
  detail
}: {
  label: string
  value: string
  detail?: string
}) => (
  <div className="min-w-0 rounded-lg border border-white/10 bg-white/4.5 px-3 py-3.5 shadow-2xl shadow-sky-950/10 sm:px-4">
    <p className="text-xs font-medium leading-4 text-white/52">{label}</p>
    <p className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{value}</p>
    {detail ? <p className="mt-1 text-xs font-medium leading-4 text-white/42">{detail}</p> : null}
  </div>
)

export const TestDataWarning = () => (
  <section
    role="status"
    className="flex flex-col gap-3 rounded-lg border border-amber-200/24 bg-amber-300/10 px-4 py-4 text-amber-50 shadow-2xl shadow-amber-950/10 sm:flex-row sm:items-start sm:px-5"
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-100/20 bg-amber-100/10 text-amber-100">
      <AlertTriangle className="h-5 w-5" />
    </div>
    <div>
      <p className="text-base font-bold leading-6 text-white">Data jsou v testovacím režimu</p>
      <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-amber-50/78">
        Výsledky zatím berte jen jako orientační. Data mohou být neúplná a chybná.
      </p>
    </div>
  </section>
)

export const ViewSwitch = ({
  activeView,
  teamName
}: {
  activeView: ResultView
  teamName?: string
}) => (
  <nav
    className="inline-flex rounded-lg border border-white/10 bg-white/4 p-1"
    aria-label="Přepnutí výsledků"
  >
    <Link
      href={getViewHref("team", teamName)}
      className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
        activeView === "team"
          ? "bg-sky-100/14 text-white ring-1 ring-sky-100/18"
          : "text-white/62 hover:bg-white/7 hover:text-white"
      }`}
    >
      <Users className="h-4 w-4" />
      Tým
    </Link>
    <Link
      href={getViewHref("league", teamName)}
      className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
        activeView === "league"
          ? "bg-sky-100/14 text-white ring-1 ring-sky-100/18"
          : "text-white/62 hover:bg-white/7 hover:text-white"
      }`}
    >
      <Trophy className="h-4 w-4" />
      Dlouhodobá soutěž
    </Link>
  </nav>
)

const placeBadgeClassNames: Record<number, string> = {
  1: "border-amber-200/85 bg-amber-400/38 text-amber-50 shadow-amber-300/20",
  2: "border-zinc-100/75 bg-zinc-200/34 text-white shadow-zinc-100/16",
  3: "border-orange-300/75 bg-orange-500/34 text-orange-50 shadow-orange-300/18"
}

export const Placement = ({ place }: { place: number | null }) => {
  if (!place) {
    return (
      <>
        <span className="flex h-7 w-7 items-center justify-center text-lg font-semibold text-white">
          -
        </span>
        <span className="w-6" aria-hidden="true" />
      </>
    )
  }

  if (place <= 3) {
    return (
      <>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold shadow-lg ${placeBadgeClassNames[place]}`}
          aria-label={`${place}. místo`}
        >
          {place}
        </span>
        <span className="w-6" aria-hidden="true" />
        <span className="sr-only">{place}. místo</span>
      </>
    )
  }

  return (
    <>
      <span className="flex h-7 w-7 items-center justify-center text-lg font-semibold text-white">
        {place}.
      </span>
      <span className="w-6" aria-hidden="true" />
    </>
  )
}
