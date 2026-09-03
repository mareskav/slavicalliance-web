import { ArrowUpRight, ListChecks } from "lucide-react"

import { getSpecialLeagueStandings, getSpecialLeagueSummaries } from "@/lib/quiz-results"
import { formatLeagueName, formatNumber } from "./_lib/formatters"
import { getLeagueTeamsWithPlacements } from "./_lib/league"
import { sortLeagueTeams } from "./_lib/sort"
import { LeagueSelect } from "./_components/LeagueSelect"
import { ResultsNavigationBoundary } from "./_components/ResultsNavigationBoundary"
import { ResultsUnavailable } from "./_components/ResultsUnavailable"
import { SpecialTable } from "./_components/SpecialTable"
import { StatCard } from "./_components/StatCard"
import { ViewSwitch } from "./_components/ViewSwitch"

export const SpecialStandingsPage = async ({
  teamName,
  leagueId
}: {
  teamName?: string
  leagueId?: string
}) => {
  let standings: Awaited<ReturnType<typeof getSpecialLeagueStandings>>
  let leagues: Awaited<ReturnType<typeof getSpecialLeagueSummaries>>

  try {
    leagues = await getSpecialLeagueSummaries()
    const selectedLeagueId = leagueId ? Number(leagueId) : null
    const effectiveLeagueId =
      selectedLeagueId && leagues.some((league) => league.leagueId === selectedLeagueId)
        ? leagueId
        : undefined

    standings = await getSpecialLeagueStandings(effectiveLeagueId)
  } catch (error) {
    console.error(error)
    return <ResultsUnavailable />
  }

  const defaultLeague = leagues[0]
  const defaultLeagueId = defaultLeague?.leagueId
  const defaultLeagueDisplayName = defaultLeague
    ? formatLeagueName(defaultLeague.leagueName, defaultLeague.periodStart)
    : undefined
  const selectedLeagueIdParam =
    standings?.leagueId === defaultLeagueId ? undefined : String(standings?.leagueId ?? "")

  if (!standings) {
    const navigationKey = ["special", leagueId ?? defaultLeagueId ?? "none", "empty"].join(":")

    return (
      <ResultsNavigationBoundary key={navigationKey}>
        <div className="space-y-8 font-sans">
          <ViewSwitch activeView="special" teamName={teamName} />
          {leagues.length > 0 && defaultLeagueId ? (
            <div className="max-w-2xl">
              <LeagueSelect
                leagues={leagues}
                selectedLeagueId={defaultLeagueId}
                defaultLeagueId={defaultLeagueId}
                view="special"
                label="Zobrazit speciál"
              />
            </div>
          ) : null}
          <section className="rounded-lg border border-white/10 bg-white/4.5 p-8">
            <h1 className="text-3xl font-bold text-white">{defaultLeagueDisplayName ?? "Speciály"}</h1>
            <p className="mt-3 text-white/65">Žádný speciál zatím nemáme v databázi.</p>
          </section>
        </div>
      </ResultsNavigationBoundary>
    )
  }

  const teamsWithPlacements = getLeagueTeamsWithPlacements(standings.teams, 0, standings.playedRounds)
  const sortedTeams = sortLeagueTeams(teamsWithPlacements, "placement", "asc")
  const leagueDisplayName = formatLeagueName(standings.leagueName, standings.periodStart)
  const navigationKey = ["special", standings.leagueId].join(":")
  const specialDateFormatter = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "long" })
  const specialPeriodStart = specialDateFormatter.format(new Date(standings.periodStart))
  const specialPeriodStop = specialDateFormatter.format(new Date(standings.periodStop))
  const specialPeriodLabel =
    specialPeriodStart === specialPeriodStop
      ? specialPeriodStart
      : `${specialPeriodStart} - ${specialPeriodStop}`

  return (
    <ResultsNavigationBoundary key={navigationKey}>
      <div className="space-y-8 font-sans">
        <section className="space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <ViewSwitch activeView="special" teamName={teamName} />
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
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-4xl">{leagueDisplayName}</h1>
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
                  view="special"
                  label="Zobrazit speciál"
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Termín" value={specialPeriodLabel} />
          <StatCard label="Odehraná kola" value={formatNumber(standings.playedRounds)} />
          <StatCard label="Týmů v soutěži" value={formatNumber(standings.teams.length)} />
          <StatCard label="Hospod" value={formatNumber(standings.totalPubs)} />
        </section>

        <section>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/4">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-sky-100/72" />
                <h2 className="text-2xl font-bold text-white">Pořadí týmů</h2>
              </div>
              <p className="mt-1 text-sm text-white/58">Seřazeno podle celkového počtu bodů sestupně.</p>
            </div>
            <SpecialTable teams={sortedTeams} />
          </div>
        </section>
      </div>
    </ResultsNavigationBoundary>
  )
}
