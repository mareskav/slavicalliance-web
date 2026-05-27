import { redirect } from "next/navigation"

import { getTeamResults, getTeamSummaries } from "@/lib/quiz-results"
import { LeagueStandingsPage } from "./LeagueStandingsPage"
import {
  getLeagueCutCount,
  getLeagueSortKey,
  getSortDirection,
  getTeamSortKey,
  type ResultView
} from "./ResultsShared"
import { ResultsUnavailable } from "./ResultsUnavailable"
import { TeamResultsPage } from "./TeamResultsPage"

export const dynamic = "force-dynamic"

const defaultTeamName = "Slavic Alliance"

const ResultsPage = async ({
  searchParams
}: {
  searchParams?: Promise<{
    team?: string
    page?: string
    pageSize?: string
    view?: string
    sort?: string
    dir?: string
    cuts?: string
    rounds?: string
  }>
}) => {
  const params = await searchParams
  const activeView: ResultView = params?.view === "league" ? "league" : "team"
  let teams

  try {
    teams = await getTeamSummaries()
  } catch (error) {
    console.error(error)
    return <ResultsUnavailable />
  }

  const fallbackTeam =
    teams.find((team) => team.teamName === defaultTeamName)?.teamName ?? teams[0]?.teamName
  const selectedTeam =
    params?.team && teams.some((team) => team.teamName === params.team) ? params.team : fallbackTeam

  if (activeView === "league" && params?.team) {
    const canonicalParams = new URLSearchParams({ view: "league" })

    if (params.page) {
      canonicalParams.set("page", params.page)
    }

    if (params.pageSize) {
      canonicalParams.set("pageSize", params.pageSize)
    }

    if (params.sort) {
      canonicalParams.set("sort", params.sort)
    }

    if (params.dir) {
      canonicalParams.set("dir", params.dir)
    }

    if (params.cuts) {
      canonicalParams.set("cuts", params.cuts)
    }

    if (params.rounds) {
      canonicalParams.set("rounds", params.rounds)
    }

    redirect(`/?${canonicalParams.toString()}`)
  }

  if (activeView === "league") {
    return (
      <LeagueStandingsPage
        teamName={selectedTeam}
        page={params?.page}
        pageSize={params?.pageSize}
        sort={getLeagueSortKey(params?.sort)}
        direction={getSortDirection(params?.dir, "desc")}
        cutCount={getLeagueCutCount(params?.cuts)}
        selectedRound={params?.rounds}
      />
    )
  }

  const selectedSummary = teams.find((team) => team.teamName === selectedTeam)
  let results

  try {
    results = selectedTeam ? await getTeamResults(selectedTeam) : []
  } catch (error) {
    console.error(error)
    return <ResultsUnavailable />
  }

  return (
    <TeamResultsPage
      teams={teams}
      selectedSummary={selectedSummary}
      results={results}
      page={params?.page}
      pageSize={params?.pageSize}
      sort={getTeamSortKey(params?.sort)}
      direction={getSortDirection(params?.dir, "desc")}
    />
  )
}

export default ResultsPage
