"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import {
  indexSnapshotPath,
  leagueSnapshotPath,
  specialLeagueSnapshotPath,
  teamSnapshotPath,
  type LeagueStandingsSnapshot,
  type ResultsIndexSnapshot,
  type TeamResultsSnapshot
} from "@repo/results-data/snapshot-paths"
import type { TeamSummary } from "@repo/results-data/quiz-results"
import { getLeagueCutCount, getLeagueSortKey, getSortDirection, getTeamSortKey } from "./_lib/navigation"
import { useSnapshot } from "./_lib/snapshots-client"
import type { ResultView } from "./_lib/types"
import { ResultsLoadingSkeleton } from "./_components/ResultsLoadingSkeleton"
import { ResultsUnavailable } from "./_components/ResultsUnavailable"
import { LeagueStandingsPage } from "./LeagueStandingsPage"
import { SpecialStandingsPage } from "./SpecialStandingsPage"
import { TeamResultsPage } from "./TeamResultsPage"

const defaultTeamName = "Slavic Alliance"

const parseTeamId = (value: string | null) => {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

const copyParams = (params: URLSearchParams, keys: string[], target: URLSearchParams) => {
  for (const key of keys) {
    const value = params.get(key)
    if (value) target.set(key, value)
  }
}

const getSelectedSummary = (teams: TeamSummary[], params: URLSearchParams) => {
  const team = params.get("team")
  const teamId = params.get("teamId")
  const requestedTeamId = parseTeamId(teamId)
  const fallbackTeam = teams.find((candidate) => candidate.teamName === defaultTeamName) ?? teams[0]

  return (
    (teamId === "none" && team
      ? teams.find((candidate) => candidate.teamId === null && candidate.teamName === team)
      : undefined) ??
    (requestedTeamId !== null && team
      ? teams.find((candidate) => candidate.teamId === requestedTeamId && candidate.teamName === team)
      : undefined) ??
    (team ? teams.find((candidate) => candidate.teamName === team) : undefined) ??
    fallbackTeam
  )
}

// Returns the canonical URL for a team link, or null when the current one is fine.
const getTeamCanonicalHref = (summary: TeamSummary, params: URLSearchParams) => {
  const team = params.get("team")

  if (!team) {
    return null
  }

  const useExplicitNullTeamId = summary.teamId === null && summary.duplicateNameCount > 1
  const canonicalTeamId =
    summary.teamId === null ? (useExplicitNullTeamId ? "none" : undefined) : String(summary.teamId)
  const teamIdParam = params.get("teamId") ?? undefined

  // Links that only carry a name (league tables have no team ids) render directly.
  const isNameOnlyLink =
    teamIdParam === undefined && team === summary.teamName && canonicalTeamId !== "none"

  if (isNameOnlyLink || (team === summary.teamName && teamIdParam === canonicalTeamId)) {
    return null
  }

  const canonical = new URLSearchParams({ team: summary.teamName })
  if (canonicalTeamId !== undefined) canonical.set("teamId", canonicalTeamId)
  copyParams(params, ["page", "pageSize", "sort", "dir"], canonical)

  return `/vysledky?${canonical.toString()}`
}

export const ResultsRoute = ({ forceView }: { forceView?: "league" }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = forceView ?? searchParams.get("view")
  const team = searchParams.get("team")
  const activeView: ResultView =
    view === "special" ? "special" : team && view !== "league" ? "team" : "league"

  const needsLeagueCanonicalRedirect = !forceView && (view === "league" || view === "special") && !!team
  const index = useSnapshot<ResultsIndexSnapshot>(indexSnapshotPath)

  const selectedSummary =
    activeView === "team" && index.data ? getSelectedSummary(index.data.teams, searchParams) : undefined
  const teamCanonicalHref = selectedSummary ? getTeamCanonicalHref(selectedSummary, searchParams) : null

  const leagueList = activeView === "special" ? index.data?.specialLeagues : index.data?.leagues
  const requestedLeagueId = Number(searchParams.get("leagueId"))
  const effectiveLeague =
    leagueList?.find((league) => league.leagueId === requestedLeagueId) ?? leagueList?.[0]

  const redirectHref = needsLeagueCanonicalRedirect
    ? (() => {
        const canonical = new URLSearchParams({ view: view as string })
        copyParams(searchParams, ["page", "pageSize", "sort", "dir", "cuts", "rounds", "leagueId"], canonical)
        return `/vysledky?${canonical.toString()}`
      })()
    : teamCanonicalHref

  const dataPath = (() => {
    if (redirectHref || !index.data) return null
    if (activeView === "team") return selectedSummary ? teamSnapshotPath(selectedSummary.teamKey) : null
    if (!effectiveLeague) return null
    return activeView === "special"
      ? specialLeagueSnapshotPath(effectiveLeague.leagueId)
      : leagueSnapshotPath(effectiveLeague.leagueId)
  })()
  const data = useSnapshot<TeamResultsSnapshot | LeagueStandingsSnapshot>(dataPath)

  useEffect(() => {
    if (redirectHref) router.replace(redirectHref)
  }, [redirectHref, router])

  const skeleton = (
    <ResultsLoadingSkeleton
      activeView={activeView}
      title={
        activeView === "league"
          ? "Dlouhodobé soutěže"
          : activeView === "special"
            ? "Speciály"
            : (team ?? defaultTeamName)
      }
      subtitle={activeView === "team" ? "Výsledky týmu u Hospodského kvízu" : undefined}
      teamName={team ?? undefined}
    />
  )

  if (index.failed || data.failed) {
    return <ResultsUnavailable />
  }

  if (redirectHref || index.loading || !index.data) {
    return skeleton
  }

  const teamName = team ?? defaultTeamName

  if (activeView === "team") {
    if (selectedSummary && data.loading) {
      return skeleton
    }

    return (
      <TeamResultsPage
        teams={index.data.teams}
        selectedSummary={selectedSummary}
        results={(data.data as TeamResultsSnapshot | undefined) ?? []}
        page={searchParams.get("page") ?? undefined}
        pageSize={searchParams.get("pageSize") ?? undefined}
        sort={getTeamSortKey(searchParams.get("sort") ?? undefined)}
        direction={getSortDirection(searchParams.get("dir") ?? undefined, "desc")}
      />
    )
  }

  // The league snapshot is `null` when the league has no standings; it is
  // undefined only while loading or when there is no league at all.
  if (effectiveLeague && data.loading) {
    return skeleton
  }

  const standings = (data.data as LeagueStandingsSnapshot | undefined) ?? null
  const leagues = leagueList ?? []

  if (activeView === "special") {
    return (
      <SpecialStandingsPage
        standings={standings}
        leagues={leagues}
        teamName={teamName}
        leagueId={effectiveLeague ? String(effectiveLeague.leagueId) : undefined}
      />
    )
  }

  return (
    <LeagueStandingsPage
      standings={standings}
      leagues={leagues}
      teamName={teamName}
      page={searchParams.get("page") ?? undefined}
      pageSize={searchParams.get("pageSize") ?? undefined}
      sort={getLeagueSortKey(searchParams.get("sort") ?? undefined)}
      direction={getSortDirection(searchParams.get("dir") ?? undefined, "desc")}
      cutCount={getLeagueCutCount(searchParams.get("cuts") ?? undefined)}
      selectedRound={searchParams.get("rounds") ?? undefined}
      leagueId={searchParams.get("leagueId") ?? undefined}
    />
  )
}
