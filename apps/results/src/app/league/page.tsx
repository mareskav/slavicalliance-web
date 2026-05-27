import { LeagueStandingsPage } from "../LeagueStandingsPage"
import { getLeagueCuts, getLeagueSortKey, getSortDirection } from "../ResultsShared"

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
  }>
}) => {
  const params = await searchParams

  return (
    <LeagueStandingsPage
      teamName={params?.team}
      page={params?.page}
      pageSize={params?.pageSize}
      sort={getLeagueSortKey(params?.sort)}
      direction={getSortDirection(params?.dir, "desc")}
      useCuts={getLeagueCuts(params?.cuts)}
      selectedRound={params?.rounds}
    />
  )
}

export default LeaguePage
