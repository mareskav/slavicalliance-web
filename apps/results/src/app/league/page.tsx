import { LeagueStandingsPage } from "../LeagueStandingsPage"
import { getLeagueCutCount, getLeagueSortKey, getSortDirection } from "../_lib/navigation"
import { ResultsNavigationBoundary } from "../_components/ResultsNavigationBoundary"

export const dynamic = "force-dynamic"

const LeaguePage = async ({
  searchParams
}: {
  searchParams?: Promise<{
    team?: string
    page?: string
    pageSize?: string
    sort?: string
    dir?: string
    cuts?: string
    rounds?: string
    leagueId?: string
  }>
}) => {
  const params = await searchParams

  return (
    <ResultsNavigationBoundary>
      <LeagueStandingsPage
        teamName={params?.team}
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

export default LeaguePage
