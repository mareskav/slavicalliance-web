"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Loader2, Trophy } from "lucide-react"
import { useTransition } from "react"

import type { LeagueSummary } from "@/lib/quiz-results"
import { formatLeagueName } from "../_lib/formatters"
import type { ResultView } from "../_lib/types"
import { useResultsNavigation } from "./ResultsNavigationContext"

type LeagueSelectProps = {
  leagues: LeagueSummary[]
  selectedLeagueId: number
  defaultLeagueId: number
  view?: Extract<ResultView, "league" | "special">
  label?: string
}

export const LeagueSelect = ({
  leagues,
  selectedLeagueId,
  defaultLeagueId,
  view = "league",
  label = "Zobrazit ligu"
}: LeagueSelectProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const appPathname = pathname.replace(/^\/vysledky(?=\/|$)/, "") || "/"
  const searchParams = useSearchParams()
  const resultsNavigation = useResultsNavigation()
  const [isPending, startTransition] = useTransition()

  const selectLeague = (nextLeagueId: number) => {
    if (nextLeagueId === selectedLeagueId) {
      return
    }

    const nextLeague = leagues.find((league) => league.leagueId === nextLeagueId)
    const fallbackTitle = view === "special" ? "Speciály" : "Dlouhodobé soutěže"
    resultsNavigation?.beginDefaultResultsNavigation({
      activeView: view,
      title: nextLeague ? formatLeagueName(nextLeague.leagueName, nextLeague.periodStart) : fallbackTitle
    })

    startTransition(() => {
      const params = new URLSearchParams(searchParams)

      params.set("view", view)
      params.set("page", "1")
      params.delete("rounds")

      if (nextLeagueId === defaultLeagueId) {
        params.delete("leagueId")
      } else {
        params.set("leagueId", String(nextLeagueId))
      }

      const nextUrl = `${appPathname}?${params.toString()}`
      const currentUrl = `${appPathname}?${searchParams.toString()}`

      if (nextUrl === currentUrl) {
        router.refresh()
      } else {
        router.push(nextUrl, { scroll: false })
      }
    })
  }

  if (leagues.length <= 1) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-white/10 bg-white/4.5 p-4 shadow-2xl shadow-sky-950/10 sm:flex-row sm:items-center">
      <label htmlFor="league-select" className="flex shrink-0 items-center gap-2 text-sm font-medium text-white/68">
        <Trophy className="h-4 w-4 text-sky-100/72" />
        {label}
      </label>

      <span className="relative min-w-0 flex-1">
        <select
          id="league-select"
          value={selectedLeagueId}
          disabled={isPending}
          onChange={(event) => {
            selectLeague(Number(event.target.value))
          }}
          className="h-10 w-full appearance-none truncate rounded-lg border border-white/10 bg-slate-950/55 px-3 pr-10 text-sm font-semibold text-white outline-none transition hover:border-sky-200/25 focus:border-sky-200/45 focus:ring-3 focus:ring-sky-200/15 disabled:cursor-wait disabled:opacity-70"
        >
          {leagues.map((league) => (
            <option key={league.leagueId} value={league.leagueId} className="bg-slate-950 text-white">
              {formatLeagueName(league.leagueName, league.periodStart)}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/54">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </span>
    </div>
  )
}
