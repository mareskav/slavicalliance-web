import { redirect } from "next/navigation"

import { getTeamResults, getTeamSummaries } from "@/lib/quiz-results"
import { getLeagueCutCount, getLeagueSortKey, getSortDirection, getTeamSortKey } from "./_lib/navigation"
import type { ResultView } from "./_lib/types"
import { ResultsUnavailable } from "./_components/ResultsUnavailable"
import { ResultsNavigationBoundary } from "./_components/ResultsNavigationBoundary"
import { LeagueStandingsPage } from "./LeagueStandingsPage"
import { TeamResultsPage } from "./TeamResultsPage"

export const dynamic = "force-dynamic"

const defaultTeamName = "Slavic Alliance"

const parseTeamId = (value: string | undefined) => {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

const getCanonicalTeamHref = (
  teamName: string,
  teamId: number | null,
  useExplicitNullTeamId: boolean,
  params?: {
    page?: string
    pageSize?: string
    sort?: string
    dir?: string
  }
) => {
  const canonicalParams = new URLSearchParams({ team: teamName })

  if (teamId !== null) {
    canonicalParams.set("teamId", String(teamId))
  } else if (useExplicitNullTeamId) {
    canonicalParams.set("teamId", "none")
  }

  if (params?.page) {
    canonicalParams.set("page", params.page)
  }

  if (params?.pageSize) {
    canonicalParams.set("pageSize", params.pageSize)
  }

  if (params?.sort) {
    canonicalParams.set("sort", params.sort)
  }

  if (params?.dir) {
    canonicalParams.set("dir", params.dir)
  }

  return `/?${canonicalParams.toString()}`
}

const ResultsPage = async ({
  searchParams
}: {
  searchParams?: Promise<{
    team?: string
    teamId?: string
    page?: string
    pageSize?: string
    view?: string
    sort?: string
    dir?: string
    cuts?: string
    rounds?: string
    leagueId?: string
  }>
}) => {
  const params = await searchParams
  const activeView: ResultView = params?.team && params?.view !== "league" ? "team" : "league"

  if (params?.view === "league" && params?.team) {
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

    if (params.leagueId) {
      canonicalParams.set("leagueId", params.leagueId)
    }

    redirect(`/?${canonicalParams.toString()}`)
  }

  if (activeView === "league") {
    return (
      <ResultsNavigationBoundary>
        <LeagueStandingsPage
          teamName={params?.team ?? defaultTeamName}
          page={params?.page}
          pageSize={params?.pageSize}
          sort={getLeagueSortKey(params?.sort)}
          direction={getSortDirection(params?.dir, "desc")}
          cutCount={getLeagueCutCount(params?.cuts)}
          selectedRound={params?.rounds}
          leagueId={params?.leagueId}
        />
      </ResultsNavigationBoundary>
    )
  }

  let teams

  try {
    teams = await getTeamSummaries()
  } catch (error) {
    console.error(error)
    return <ResultsUnavailable />
  }

  const fallbackTeam =
    teams.find((team) => team.teamName === defaultTeamName) ?? teams[0]
  const requestedTeamId = parseTeamId(params?.teamId)
  const selectedSummary =
    (params?.teamId === "none" && params.team
      ? teams.find((team) => team.teamId === null && team.teamName === params.team)
      : undefined) ??
    (requestedTeamId !== null && params?.team
      ? teams.find((team) => team.teamId === requestedTeamId && team.teamName === params.team)
      : undefined) ??
    (params?.team ? teams.find((team) => team.teamName === params.team) : undefined) ??
    fallbackTeam

  if (selectedSummary && params?.team) {
    const useExplicitNullTeamId = selectedSummary.teamId === null && selectedSummary.duplicateNameCount > 1
    const canonicalTeamId =
      selectedSummary.teamId === null
        ? useExplicitNullTeamId
          ? "none"
          : undefined
        : String(selectedSummary.teamId)

    if (params.team !== selectedSummary.teamName || params.teamId !== canonicalTeamId) {
      redirect(
        getCanonicalTeamHref(
          selectedSummary.teamName,
          selectedSummary.teamId,
          useExplicitNullTeamId,
          {
            page: params.page,
            pageSize: params.pageSize,
            sort: params.sort,
            dir: params.dir
          }
        )
      )
    }
  }

  let results

  try {
    results = selectedSummary
      ? await getTeamResults(selectedSummary.teamId, selectedSummary.teamName)
      : []
  } catch (error) {
    console.error(error)
    return <ResultsUnavailable />
  }

  return (
    <ResultsNavigationBoundary>
      <TeamResultsPage
        teams={teams}
        selectedSummary={selectedSummary}
        results={results}
        page={params?.page}
        pageSize={params?.pageSize}
        sort={getTeamSortKey(params?.sort)}
        direction={getSortDirection(params?.dir, "desc")}
      />
    </ResultsNavigationBoundary>
  )
}

export default ResultsPage
