// Client-safe: no pg import. Shared by the publisher (writes) and the site (reads).
import type { LeagueStandings, LeagueSummary, QuizResult, TeamSummary } from "./quiz-results"

export type ResultsIndexSnapshot = {
  generatedAt: string
  lastResultDate: string | null
  teams: TeamSummary[]
  leagues: LeagueSummary[]
  specialLeagues: LeagueSummary[]
}

export type TeamResultsSnapshot = QuizResult[]
export type LeagueStandingsSnapshot = LeagueStandings | null

// Short on purpose: snapshots are plain R2 reads (no CPU limit), and admins want
// a saved result to show up quickly.
export const snapshotCacheControl = "public, max-age=60"

export const indexSnapshotPath = "index.json"
export const manifestPath = "manifest.json"

// Team keys contain ':' and arbitrary team names, so they are base64url-encoded
// (UTF-8) into a path-safe segment both sides can compute.
const toBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ""

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

export const teamSnapshotPath = (teamKey: string) => `team/${toBase64Url(teamKey)}.json`
export const leagueSnapshotPath = (leagueId: number) => `league/${leagueId}.json`
export const specialLeagueSnapshotPath = (leagueId: number) => `special/${leagueId}.json`
