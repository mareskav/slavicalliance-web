import {
  getLatestQuizResultsUpdate,
  getLongTermLeagueStandings,
  getPrahaLeagueSummaries,
  getSpecialLeagueStandings,
  getSpecialLeagueSummaries,
  getTeamSummaries,
  loadAllTeamResults
} from "./quiz-results"
import {
  indexSnapshotPath,
  leagueSnapshotPath,
  specialLeagueSnapshotPath,
  teamSnapshotPath,
  type ResultsIndexSnapshot
} from "./snapshot-paths"

// Builds every public JSON snapshot as { path -> serialized JSON }. Order of
// teams/leagues is whatever the SQL returns, so output is deterministic and the
// publisher can skip unchanged files by comparing hashes.
export const buildSnapshots = async (now = new Date()): Promise<Map<string, string>> => {
  const [lastResultDate, teams, leagues, specialLeagues, teamResults] = await Promise.all([
    getLatestQuizResultsUpdate(),
    getTeamSummaries(),
    getPrahaLeagueSummaries(),
    getSpecialLeagueSummaries(),
    loadAllTeamResults()
  ])
  const files = new Map<string, string>()
  const index: ResultsIndexSnapshot = {
    generatedAt: now.toISOString(),
    lastResultDate,
    teams,
    leagues,
    specialLeagues
  }

  for (const team of teams) {
    files.set(teamSnapshotPath(team.teamKey), JSON.stringify(teamResults.get(team.teamKey) ?? []))
  }

  for (const league of leagues) {
    const standings = await getLongTermLeagueStandings(String(league.leagueId))
    files.set(leagueSnapshotPath(league.leagueId), JSON.stringify(standings))
  }

  for (const league of specialLeagues) {
    const standings = await getSpecialLeagueStandings(String(league.leagueId))
    files.set(specialLeagueSnapshotPath(league.leagueId), JSON.stringify(standings))
  }

  // index.json carries generatedAt, so it differs on every run; keep it last and
  // out of the "unchanged" comparison by the publisher (it is always uploaded).
  files.set(indexSnapshotPath, JSON.stringify(index))

  return files
}
