import { ArrowUpRight, ListChecks } from "lucide-react"

import { getLongTermLeagueStandings, getPrahaLeagueSummaries } from "@/lib/quiz-results"
import { pageSizeOptions, type LeagueCutCount } from "./_lib/constants"
import { formatLeagueName, formatNumber, parsePositiveInt } from "./_lib/formatters"
import { getLeagueTeamsWithPlacements } from "./_lib/league"
import {
  getLeaguePaginationHref,
  getLeagueSelectedRoundCount,
  getVisiblePages
} from "./_lib/navigation"
import { sortLeagueTeams } from "./_lib/sort"
import type { LeagueSortKey, SortDirection } from "./_lib/types"
import { LeagueSelect } from "./_components/LeagueSelect"
import { LeagueTable } from "./_components/LeagueTable"
import { LeagueTableControls } from "./_components/LeagueTableControls"
import { ResultsUnavailable } from "./_components/ResultsUnavailable"
import { StatCard } from "./_components/StatCard"
import { TableFooter } from "./_components/TableFooter"
import { ViewSwitch } from "./_components/ViewSwitch"

export const LeagueStandingsPage = async ({
  teamName,
  page,
  pageSize: requestedPageSizeValue,
  sort,
  direction,
  cutCount,
  selectedRound,
  leagueId
}: {
  teamName?: string
  page?: string
  pageSize?: string
  sort: LeagueSortKey
  direction: SortDirection
  cutCount: LeagueCutCount
  selectedRound?: string
  leagueId?: string
}) => {
  let standings: Awaited<ReturnType<typeof getLongTermLeagueStandings>>
  let leagues: Awaited<ReturnType<typeof getPrahaLeagueSummaries>>

  try {
    const result = await Promise.all([
      getLongTermLeagueStandings(leagueId),
      getPrahaLeagueSummaries()
    ])
    standings = result[0]
    leagues = result[1]
  } catch (error) {
    console.error(error)
    return <ResultsUnavailable />
  }

  const defaultLeague = leagues.find((league) => league.leagueName === "Finále Praha")
  const defaultLeagueId = defaultLeague?.leagueId
  const defaultLeagueDisplayName = defaultLeague
    ? formatLeagueName(defaultLeague.leagueName, defaultLeague.periodStart)
    : undefined
  const selectedLeagueIdParam =
    standings?.leagueId === defaultLeagueId ? undefined : String(standings?.leagueId ?? "")

  if (!standings) {
    return (
      <div className="space-y-8 font-sans">
        <ViewSwitch activeView="league" teamName={teamName} />
        {leagues.length > 0 && defaultLeagueId ? (
          <div className="max-w-2xl">
            <LeagueSelect
              leagues={leagues}
              selectedLeagueId={defaultLeagueId}
              defaultLeagueId={defaultLeagueId}
            />
          </div>
        ) : null}
        <section className="rounded-lg border border-white/10 bg-white/4.5 p-8">
          <h1 className="text-3xl font-bold text-white">
            {defaultLeagueDisplayName ?? "Vybraná liga"}
          </h1>
          <p className="mt-3 text-white/65">
            V tabulce public.quiz_leagues není záznam vybrané ligy.
          </p>
        </section>
      </div>
    )
  }

  const selectedRoundCount = getLeagueSelectedRoundCount(selectedRound, standings.playedRounds)
  const useCuts = cutCount > 0
  const teamsWithPlacements = getLeagueTeamsWithPlacements(
    standings.teams,
    cutCount,
    selectedRoundCount
  )
  const sortedTeams = sortLeagueTeams(teamsWithPlacements, sort, direction)
  const requestedPageSize = parsePositiveInt(requestedPageSizeValue, pageSizeOptions[0])
  const pageSize = pageSizeOptions.includes(requestedPageSize)
    ? requestedPageSize
    : pageSizeOptions[0]
  const totalResults = standings.teams.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const currentPage = Math.min(parsePositiveInt(page, 1), totalPages)
  const visiblePages = getVisiblePages(currentPage, totalPages)
  const pageStartIndex = (currentPage - 1) * pageSize
  const paginatedTeams = sortedTeams.slice(pageStartIndex, pageStartIndex + pageSize)
  const resultRangeStart = totalResults === 0 ? 0 : pageStartIndex + 1
  const resultRangeEnd = Math.min(pageStartIndex + pageSize, totalResults)
  const leagueDisplayName = formatLeagueName(standings.leagueName, standings.periodStart)
  const leaguePeriodStart = new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "long"
  }).format(new Date(standings.periodStart))
  const leaguePeriodStop = new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "long"
  }).format(new Date(standings.periodStop))
  const sortDescription =
    sort === "placement"
      ? `Seřazeno podle pořadí ${direction === "asc" ? "vzestupně" : "sestupně"}.`
      : sort === "team"
        ? `Seřazeno podle názvu týmu ${direction === "asc" ? "vzestupně" : "sestupně"}.`
        : sort === "rounds"
          ? `Seřazeno podle počtu odehraných kol ${direction === "asc" ? "vzestupně" : "sestupně"}.`
          : `Seřazeno podle ${useCuts ? "součtu bodů po škrtech" : "součtu bodů"} ${direction === "asc" ? "vzestupně" : "sestupně"}.`

  return (
    <div className="space-y-8 font-sans">
      <section className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <ViewSwitch activeView="league" teamName={teamName} />
          <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:min-w-40 lg:items-end">
            {standings.leagueUrl ? (
              <a
                href={standings.leagueUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-sky-100/18 bg-sky-100/10 px-3 text-sm font-semibold text-sky-50/82 transition hover:bg-sky-100/15 hover:text-white"
              >
                Detail soutěže
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_480px]">
          <div className="order-2 min-w-0 lg:order-1">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-4xl">
              {leagueDisplayName}
            </h1>
            {standings.lastResultDate ? (
              <p className="mt-3 text-sm text-white/40">
                Data aktualizována{" "}
                {new Intl.DateTimeFormat("cs-CZ", {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Prague"
                }).format(new Date(standings.lastResultDate))}
              </p>
            ) : null}
          </div>
          {defaultLeagueId ? (
            <div className="order-1 lg:order-2">
              <LeagueSelect
                leagues={leagues}
                selectedLeagueId={standings.leagueId}
                defaultLeagueId={defaultLeagueId}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Termín ligy" value={`${leaguePeriodStart} - ${leaguePeriodStop}`} />
        <StatCard label="Celkem kol" value={formatNumber(standings.totalRounds)} />
        <StatCard label="Týmů v soutěži" value={formatNumber(standings.teams.length)} />
        <StatCard label="Hospod" value={formatNumber(standings.totalPubs)} />
      </section>

      <section>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/4">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-sky-100/72" />
                <h2 className="text-2xl font-bold text-white">Pořadí týmů</h2>
              </div>
              <p className="mt-1 text-sm text-white/58">{sortDescription}</p>
            </div>
            <LeagueTableControls
              teamName={teamName}
              pageSize={pageSize}
              sort={sort}
              direction={direction}
              cutCount={cutCount}
              selectedRoundCount={selectedRoundCount}
              playedRounds={standings.playedRounds}
              currentPage={currentPage}
              leagueId={selectedLeagueIdParam}
            />
          </div>
          <LeagueTable
            teams={paginatedTeams}
            sort={sort}
            direction={direction}
            cutCount={cutCount}
            teamName={teamName}
            pageSize={pageSize}
            selectedRoundCount={selectedRoundCount}
            leagueId={selectedLeagueIdParam}
          />
          <TableFooter
            rangeStart={resultRangeStart}
            rangeEnd={resultRangeEnd}
            total={totalResults}
            pageSize={pageSize}
            currentPage={currentPage}
            totalPages={totalPages}
            visiblePages={visiblePages}
            getPageHref={(p) =>
              getLeaguePaginationHref(
                teamName,
                p,
                pageSize,
                cutCount,
                selectedRoundCount,
                sort,
                direction,
                selectedLeagueIdParam
              )
            }
          />
        </div>
      </section>
    </div>
  )
}
