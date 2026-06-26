"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check, ChevronDown, Loader2, Search, Trophy, X } from "lucide-react"
import { KeyboardEvent, useEffect, useMemo, useRef, useState, useTransition } from "react"

import type { LeagueSummary } from "@/lib/quiz-results"
import { formatLeagueName } from "../_lib/formatters"

type LeagueSelectProps = {
  leagues: LeagueSummary[]
  selectedLeagueId: number
  defaultLeagueId: number
}

export const LeagueSelect = ({
  leagues,
  selectedLeagueId,
  defaultLeagueId
}: LeagueSelectProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const appPathname = pathname.replace(/^\/vysledky(?=\/|$)/, "") || "/"
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const selectedLeague = leagues.find((league) => league.leagueId === selectedLeagueId)
  const selectedLeagueName = selectedLeague
    ? formatLeagueName(selectedLeague.leagueName, selectedLeague.periodStart)
    : ""
  const [query, setQuery] = useState(selectedLeagueName)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredLeagues = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query)

    if (!normalizedQuery) {
      return leagues
    }

    return leagues.filter((league) =>
      normalizeSearchValue(formatLeagueName(league.leagueName, league.periodStart)).includes(normalizedQuery)
    )
  }, [query, leagues])

  useEffect(() => {
    setQuery(selectedLeagueName)
  }, [selectedLeagueName])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery(selectedLeagueName)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [selectedLeagueName])

  const selectLeague = (nextLeague: LeagueSummary) => {
    setQuery(formatLeagueName(nextLeague.leagueName, nextLeague.periodStart))
    setIsOpen(false)

    if (nextLeague.leagueId === selectedLeagueId) {
      return
    }

    startTransition(() => {
      const params = new URLSearchParams(searchParams)

      params.set("view", "league")
      params.set("page", "1")
      params.delete("rounds")

      if (nextLeague.leagueId === defaultLeagueId) {
        params.delete("leagueId")
      } else {
        params.set("leagueId", String(nextLeague.leagueId))
      }

      router.push(`${appPathname}?${params.toString()}`, { scroll: false })
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredLeagues.length - 1, 0)))
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()

      const activeLeague = filteredLeagues[activeIndex]

      if (activeLeague) {
        selectLeague(activeLeague)
      }

      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setIsOpen(false)
      setQuery(selectedLeagueName)
      inputRef.current?.blur()
    }
  }

  if (leagues.length <= 1) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-white/10 bg-white/4.5 p-4 shadow-2xl shadow-sky-950/10 sm:flex-row sm:items-center">
      <label htmlFor="league-select" className="flex shrink-0 items-center gap-2 text-sm font-medium text-white/68">
        <Trophy className="h-4 w-4 text-sky-100/72" />
        Zobrazit ligu
      </label>

      <div ref={containerRef} className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/42">
          <Search className="h-4 w-4" />
        </div>

        <input
          ref={inputRef}
          id="league-select"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="league-select-options"
          aria-expanded={isOpen}
          aria-activedescendant={
            isOpen && filteredLeagues[activeIndex] ? `league-select-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          value={query}
          disabled={isPending}
          onFocus={(event) => {
            setIsOpen(true)
            event.target.select()
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/55 px-9 pr-10 text-sm font-semibold text-white outline-none transition placeholder:text-white/34 hover:border-sky-200/25 focus:border-sky-200/45 focus:ring-3 focus:ring-sky-200/15 disabled:cursor-wait disabled:opacity-70"
        />

        <div className="absolute inset-y-0 right-3 flex items-center text-white/54">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : query ? (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(event) => {
                event.preventDefault()
                setQuery("")
                setIsOpen(true)
                inputRef.current?.focus()
              }}
              className="transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <ChevronDown className="pointer-events-none h-4 w-4" />
          )}
        </div>

        {isOpen ? (
          <div
            id="league-select-options"
            role="listbox"
            className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-white/10 bg-slate-950/98 p-1 shadow-2xl shadow-black/30 ring-1 ring-sky-100/10"
          >
            {filteredLeagues.length > 0 ? (
              filteredLeagues.map((league, index) => {
                const leagueName = formatLeagueName(league.leagueName, league.periodStart)
                const isSelected = league.leagueId === selectedLeagueId
                const isActive = index === activeIndex

                return (
                  <button
                    key={league.leagueId}
                    id={`league-select-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => {
                      setActiveIndex(index)
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      selectLeague(league)
                    }}
                    className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                      isActive ? "bg-sky-100/14 text-white" : "text-white/76 hover:bg-white/7 hover:text-white"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{leagueName}</span>
                    </span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0 text-sky-100/82" /> : null}
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-2 text-sm font-medium text-white/48">Žádná liga nenalezena</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

const normalizeSearchValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("cs-CZ")
