import { getTeamResults, getTeamSummaries } from "@/lib/quiz-results"
import { LeagueStandingsPage } from "./LeagueStandingsPage"
import { getLeagueCuts, getLeagueSortKey, getSortDirection, getTeamSortKey, type ResultView } from "./ResultsShared"
import { TeamResultsPage } from "./TeamResultsPage"

export const dynamic = "force-dynamic"

const ResultsPage = async ({
  searchParams,
}: {
  searchParams?: Promise<{ team?: string; page?: string; pageSize?: string; view?: string; sort?: string; dir?: string; cuts?: string }>
}) => {
  const params = await searchParams
  const teams = await getTeamSummaries()
  const selectedTeam = params?.team && teams.some((team) => team.teamName === params.team) ? params.team : teams[0]?.teamName
  const activeView: ResultView = params?.view === "league" ? "league" : "team"

  if (activeView === "league") {
    return (
      <LeagueStandingsPage
        teamName={selectedTeam}
        page={params?.page}
        pageSize={params?.pageSize}
        sort={getLeagueSortKey(params?.sort)}
        direction={getSortDirection(params?.dir, "desc")}
        useCuts={getLeagueCuts(params?.cuts)}
      />
    )
  }

  const selectedSummary = teams.find((team) => team.teamName === selectedTeam)
  const results = selectedTeam ? await getTeamResults(selectedTeam) : []

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
