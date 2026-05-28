import Link from "next/link"
import { ArrowUpRight, ListChecks } from "lucide-react"

import { getLongTermLeagueStandings } from "@/lib/quiz-results"
import { LeagueRoundSelect } from "./LeagueRoundSelect"
import { PageSizeSelect } from "./PageSizeSelect"
import { ResultsUnavailable } from "./ResultsUnavailable"
import {
  formatDroppedPoints,
  formatDate,
  formatNumber,
  getLeagueCutsHref,
  getLeaguePaginationHref,
  getLeagueSelectedRoundCount,
  getLeagueSortHref,
  getLeagueTeamsWithPlacements,
  getVisiblePages,
  leagueCutOptions,
  pageSizeOptions,
  parsePositiveInt,
  type LeagueCutCount,
  type LeagueSortKey,
  Placement,
  type SortDirection,
  StatCard,
  SortHeader,
  sortLeagueTeams,
  TestDataWarning,
  ViewSwitch
} from "./ResultsShared"

export const LeagueStandingsPage = async ({
  teamName,
  page,
  pageSize: requestedPageSizeValue,
  sort,
  direction,
  cutCount,
  selectedRound
}: {
  teamName?: string
  page?: string
  pageSize?: string
  sort: LeagueSortKey
  direction: SortDirection
  cutCount: LeagueCutCount
  selectedRound?: string
}) => {
  let standings

  try {
    standings = await getLongTermLeagueStandings()
  } catch (error) {
    console.error(error)
    return <ResultsUnavailable />
  }

  if (!standings) {
    return (
      <div className="space-y-8 font-sans">
        <ViewSwitch activeView="league" teamName={teamName} />
        <section className="rounded-lg border border-white/10 bg-white/4.5 p-8">
          <h1 className="text-3xl font-bold text-white">Dlouhodobá soutěž</h1>
          <p className="mt-3 text-white/65">
            V tabulce public.quiz_leagues není záznam Finále Praha.
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
  const leagueYear = new Date(standings.periodStart).getFullYear()
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
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <ViewSwitch activeView="league" teamName={teamName} />
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-4xl">
            Dlouhodobá soutěž
          </h1>
          <p className="mt-3 max-w-3xl text-base font-medium leading-6 text-white/58 sm:text-lg">
            Jak si stojíme v dlouhodobce u Hospodského kvízu?
          </p>
          {standings.lastResultDate ? (
            <p className="mt-1 text-sm text-white/40">
              Data aktualizována{" "}
              {new Intl.DateTimeFormat("cs-CZ", {
                day: "numeric",
                month: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              }).format(new Date(standings.lastResultDate))}
            </p>
          ) : null}
        </div>

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
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={`${standings.leagueName} ${leagueYear}`}
          value={`${leaguePeriodStart} - ${leaguePeriodStop}`}
        />
        <StatCard label="Celkem kol" value={formatNumber(standings.totalRounds)} />
        <StatCard label="Týmů v soutěži" value={formatNumber(standings.teams.length)} />
        <StatCard label="Hospod" value={formatNumber(standings.totalPubs)} />
      </section>

      {/*<TestDataWarning />*/}

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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-950/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:min-w-[230px]">
                <div>
                  <p className="text-sm font-semibold text-white">Odehraná kola</p>
                  {/*<p className="mt-1 text-sm text-white/56">Tabulka po vybraném kole.</p>*/}
                </div>
                <LeagueRoundSelect
                  selectedRoundCount={selectedRoundCount}
                  playedRounds={standings.playedRounds}
                />
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-950/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:min-w-[430px]">
                <div>
                  <p className="text-sm font-semibold text-white">Škrtání výsledků</p>
                  <p className="mt-1 text-sm text-white/56">
                    {useCuts
                      ? `Škrtá se ${cutCount === 1 ? "1 nejhorší výsledek" : "2 nejhorší výsledky"}`
                      : "Počítají se všechny výsledky"}
                  </p>
                </div>
                <div
                  className="inline-flex h-10 shrink-0 rounded-lg border border-white/10 bg-white/5 p-1"
                  aria-label="Počet škrtaných výsledků"
                >
                  {leagueCutOptions.map((option) => (
                    <Link
                      key={option}
                      href={getLeagueCutsHref(
                        teamName,
                        pageSize,
                        sort,
                        direction,
                        option,
                        selectedRoundCount,
                        currentPage
                      )}
                      scroll={false}
                      aria-current={option === cutCount ? "true" : undefined}
                      className={`inline-flex min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold transition ${
                        option === cutCount
                          ? "bg-sky-300/28 text-white shadow-sm shadow-sky-950/30 ring-1 ring-sky-100/38"
                          : "text-white/58 hover:bg-white/7 hover:text-white"
                      }`}
                    >
                      {option === 0 ? "Vyp." : option}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table
              className={`w-full ${useCuts ? "min-w-[552px]" : "min-w-[440px]"} table-fixed text-left text-sm md:min-w-[820px] md:table-auto md:text-base`}
            >
              <thead className="border-b border-white/10 text-xs uppercase text-white/45">
                <tr>
                  <th
                    className="w-14 px-1.5 py-3 font-semibold sm:px-2 md:w-28 md:px-5"
                    aria-sort={
                      sort === "placement"
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    <SortHeader
                      href={getLeagueSortHref(
                        teamName,
                        "placement",
                        sort,
                        direction,
                        pageSize,
                        cutCount,
                        selectedRoundCount,
                        "asc"
                      )}
                      label="Pořadí"
                      isActive={sort === "placement"}
                      direction={direction}
                    />
                  </th>
                  <th
                    className="px-1.5 py-3 font-semibold sm:px-2 md:px-5"
                    aria-sort={
                      sort === "team"
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    <SortHeader
                      href={getLeagueSortHref(
                        teamName,
                        "team",
                        sort,
                        direction,
                        pageSize,
                        cutCount,
                        selectedRoundCount,
                        "asc"
                      )}
                      label="Tým"
                      isActive={sort === "team"}
                      direction={direction}
                    />
                  </th>
                  <th
                    className="w-16 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-36 md:px-5"
                    aria-sort={
                      sort === "points"
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    <SortHeader
                      href={getLeagueSortHref(
                        teamName,
                        "points",
                        sort,
                        direction,
                        pageSize,
                        cutCount,
                        selectedRoundCount,
                        "desc"
                      )}
                      label={
                        <>
                          <span className="md:hidden">Body</span>
                          <span className="hidden md:inline">
                            {useCuts ? "Body po škrtech" : "Body"}
                          </span>
                        </>
                      }
                      align="right"
                      isActive={sort === "points"}
                      direction={direction}
                    />
                  </th>
                  <th className="w-16 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-36 md:px-5">
                    <span className="md:hidden">Posl. kvíz</span>
                    <span className="hidden md:inline">Poslední kvíz</span>
                  </th>
                  {useCuts ? (
                    <th className="w-28 px-2 py-3 text-right font-semibold md:w-36 md:px-5">
                      <span className="md:hidden">Škrt.</span>
                      <span className="hidden md:inline">Škrtnuto</span>
                    </th>
                  ) : null}
                  <th
                    className="w-20 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-44 md:px-5"
                    aria-sort={
                      sort === "rounds"
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    <SortHeader
                      href={getLeagueSortHref(
                        teamName,
                        "rounds",
                        sort,
                        direction,
                        pageSize,
                        cutCount,
                        selectedRoundCount,
                        "desc"
                      )}
                      label={
                        <>
                          <span className="md:hidden">Kola</span>
                          <span className="hidden md:inline">Odehraná kola</span>
                        </>
                      }
                      align="right"
                      isActive={sort === "rounds"}
                      direction={direction}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {paginatedTeams.map((team) => (
                  <tr key={team.teamName} className="transition hover:bg-white/4">
                    <td className="px-1 py-2.5 sm:px-2 md:px-5 md:py-3">
                      <div className="flex justify-center md:justify-start">
                        <Placement place={team.placement} />
                      </div>
                    </td>
                    <td className="min-w-0 truncate px-1.5 py-2.5 font-semibold text-white sm:px-2 md:px-5 md:py-3">
                      {team.teamName}
                    </td>
                    <td className="px-1.5 py-2.5 text-right text-base font-bold text-white sm:px-2 md:px-5 md:py-3 md:text-lg">
                      {formatNumber(team.displayPoints)}
                    </td>
                    <td
                      className="px-1.5 py-2.5 text-right font-semibold text-white/76 sm:px-2 md:px-5 md:py-3"
                      title={
                        team.displayLastQuizDate
                          ? `Kvíz hrán: ${formatDate(team.displayLastQuizDate)}`
                          : undefined
                      }
                    >
                      {formatNumber(team.displayLastQuizPoints)}
                    </td>
                    {useCuts ? (
                      <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold text-white/76 md:px-5 md:py-3">
                        {formatDroppedPoints(team.droppedPoints)}
                      </td>
                    ) : null}
                    <td className="px-1.5 py-2.5 text-right font-semibold text-white/76 sm:px-2 md:px-5 md:py-3">
                      {team.displayQuizCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <p className="text-sm text-white/52">
              {resultRangeStart}-{resultRangeEnd} z {totalResults}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <PageSizeSelect pageSize={pageSize} options={pageSizeOptions} />

              <nav className="flex items-center gap-1" aria-label="Stránkování výsledků">
                <Link
                  href={getLeaguePaginationHref(
                    teamName,
                    Math.max(1, currentPage - 1),
                    pageSize,
                    cutCount,
                    selectedRoundCount,
                    sort,
                    direction
                  )}
                  aria-disabled={currentPage === 1}
                  className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition ${
                    currentPage === 1
                      ? "pointer-events-none text-white/28"
                      : "text-white/68 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  Předchozí
                </Link>

                {visiblePages.map((page) => (
                  <Link
                    key={page}
                    href={getLeaguePaginationHref(
                      teamName,
                      page,
                      pageSize,
                      cutCount,
                      selectedRoundCount,
                      sort,
                      direction
                    )}
                    aria-current={page === currentPage ? "page" : undefined}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                      page === currentPage
                        ? "bg-sky-100/14 text-white ring-1 ring-sky-100/20"
                        : "text-white/58 hover:bg-white/7 hover:text-white"
                    }`}
                  >
                    {page}
                  </Link>
                ))}

                <Link
                  href={getLeaguePaginationHref(
                    teamName,
                    Math.min(totalPages, currentPage + 1),
                    pageSize,
                    cutCount,
                    selectedRoundCount,
                    sort,
                    direction
                  )}
                  aria-disabled={currentPage === totalPages}
                  className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition ${
                    currentPage === totalPages
                      ? "pointer-events-none text-white/28"
                      : "text-white/68 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  Další
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
