"use client"

import { useRouter } from "next/navigation"
import { Check, ChevronDown, Loader2, Search, Users, X } from "lucide-react"
import { KeyboardEvent, useEffect, useMemo, useRef, useState, useTransition } from "react"

import { useResultsNavigation } from "./ResultsNavigationContext"

type TeamSelectOption = {
  teamId: number | null
  teamKey: string
  teamName: string
  teamPub: string | null
  quizCount: number
  duplicateNameCount: number
}

type TeamSelectProps = {
  teams: TeamSelectOption[]
  selectedTeamId: number | null
  selectedTeamName: string
}

export const TeamSelect = ({ teams, selectedTeamId, selectedTeamName }: TeamSelectProps) => {
  const router = useRouter()
  const resultsNavigation = useResultsNavigation()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(selectedTeamName)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredTeams = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query)

    if (!normalizedQuery) {
      return teams
    }

    return teams.filter((team) => normalizeSearchValue(team.teamName).includes(normalizedQuery))
  }, [query, teams])

  useEffect(() => {
    setQuery(selectedTeamName)
  }, [selectedTeamName])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery(selectedTeamName)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [selectedTeamName])

  const selectedTeamKey = getTeamKey(selectedTeamId, selectedTeamName)

  const selectTeam = (nextTeam: TeamSelectOption) => {
    setQuery(nextTeam.teamName)
    setIsOpen(false)

    if (nextTeam.teamKey === selectedTeamKey) {
      return
    }

    resultsNavigation?.beginResultsNavigation({
      activeView: "team",
      title: nextTeam.teamName,
      subtitle: "Výsledky týmu u Hospodského kvízu",
      teamName: nextTeam.teamName
    })

    startTransition(() => {
      const params = new URLSearchParams({ team: nextTeam.teamName })

      if (nextTeam.teamId !== null) {
        params.set("teamId", String(nextTeam.teamId))
      } else if (nextTeam.duplicateNameCount > 1) {
        params.set("teamId", "none")
      }

      router.push(`/?${params.toString()}`)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredTeams.length - 1, 0)))
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

      const activeTeam = filteredTeams[activeIndex]

      if (activeTeam) {
        selectTeam(activeTeam)
      }

      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setIsOpen(false)
      setQuery(selectedTeamName)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-white/10 bg-white/4.5 p-4 shadow-2xl shadow-sky-950/10 sm:flex-row sm:items-center">
      <label htmlFor="team-select" className="flex shrink-0 items-center gap-2 text-sm font-medium text-white/68">
        <Users className="h-4 w-4 text-sky-100/72" />
        Zobrazit tým
      </label>

      <div ref={containerRef} className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/42">
          <Search className="h-4 w-4" />
        </div>

        <input
          ref={inputRef}
          id="team-select"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="team-select-options"
          aria-expanded={isOpen}
          aria-activedescendant={
            isOpen && filteredTeams[activeIndex] ? `team-select-option-${activeIndex}` : undefined
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
              onMouseDown={(e) => {
                e.preventDefault()
                setQuery("")
                setIsOpen(true)
                inputRef.current?.focus()
              }}
              className="transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <ChevronDown className="h-4 w-4 pointer-events-none" />
          )}
        </div>

        {isOpen ? (
          <div
            id="team-select-options"
            role="listbox"
            className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-white/10 bg-slate-950/98 p-1 shadow-2xl shadow-black/30 ring-1 ring-sky-100/10"
          >
            {filteredTeams.length > 0 ? (
              filteredTeams.map((team, index) => {
                const isSelected = team.teamKey === selectedTeamKey
                const isActive = index === activeIndex

                return (
                  <button
                    key={team.teamKey}
                    id={`team-select-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => {
                      setActiveIndex(index)
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      selectTeam(team)
                    }}
                    className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                      isActive ? "bg-sky-100/14 text-white" : "text-white/76 hover:bg-white/7 hover:text-white"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{team.teamName}</span>
                      <span className="block text-xs font-medium text-white/42">
                        {team.quizCount} kvízů
                        {team.duplicateNameCount > 1
                          ? ` - ${team.teamPub ?? "hospoda neuvedena"}`
                          : ""}
                      </span>
                    </span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0 text-sky-100/82" /> : null}
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-2 text-sm font-medium text-white/48">Žádný tým nenalezen</div>
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

const getTeamKey = (teamId: number | null, teamName: string) =>
  teamId === null ? `name:${teamName}` : `id:${teamId}:name:${teamName}`
