"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Loader2 } from "lucide-react"
import { useTransition } from "react"

import { useResultsNavigation } from "./ResultsNavigationContext"

type LeagueRoundSelectProps = {
  selectedRoundCount: number
  playedRounds: number
}

export const LeagueRoundSelect = ({ selectedRoundCount, playedRounds }: LeagueRoundSelectProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const appPathname = pathname.replace(/^\/vysledky(?=\/|$)/, "") || "/"
  const searchParams = useSearchParams()
  const resultsNavigation = useResultsNavigation()
  const [isPending, startTransition] = useTransition()
  const options = Array.from({ length: Math.max(playedRounds, 1) }, (_, index) => index + 1)

  return (
    <label className="flex items-center text-sm text-white/58" aria-label="Vybrat odehrané kolo">
      <span className="relative">
        <select
          value={selectedRoundCount}
          disabled={isPending}
          onChange={(event) => {
            const selectedCount = Number(event.target.value)
            const params = new URLSearchParams(searchParams)

            params.set("view", "league")
            params.set("page", "1")

            if (selectedCount === playedRounds) {
              params.delete("rounds")
            } else {
              params.set("rounds", event.target.value)
            }

            resultsNavigation?.beginDefaultResultsNavigation({ activeView: "league" })

            startTransition(() => {
              router.push(`${appPathname}?${params.toString()}`, { scroll: false })
            })
          }}
          className="h-9 appearance-none rounded-lg border border-white/10 bg-slate-950/55 px-3 pr-9 text-sm font-semibold text-white outline-none transition hover:border-sky-200/25 focus:border-sky-200/45 focus:ring-3 focus:ring-sky-200/15 disabled:cursor-wait disabled:opacity-70"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-slate-950 text-white">
              {option}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-white/54">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </span>
    </label>
  )
}
