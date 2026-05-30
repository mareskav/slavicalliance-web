"use client"

import Link from "next/link"
import { ChevronDown, Search, Users, X } from "lucide-react"
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { format, isToday, isTomorrow, parseISO } from "date-fns"
import { cs } from "date-fns/locale"

export type TeamReservationOption = {
  teamName: string
  reservations: {
    quizDate: string
    quizTime: string | null
    city: string
    pubName: string
    pubUrl: string
    reservationUrl: string
  }[]
}

type Props = {
  teams: TeamReservationOption[]
}

const parseQuizDate = (date: string) => parseISO(`${date}T12:00:00`)

const formatTime = (time: string | null) => (time ? time.slice(0, 5) : "Čas bude upřesněn")

const formatDateLabel = (date: string) => {
  const parsed = parseQuizDate(date)
  if (isToday(parsed)) return "Dnes"
  if (isTomorrow(parsed)) return "Zítra"
  return format(parsed, "EEEE d. M.", { locale: cs })
}

const formatFullDate = (date: string) => format(parseQuizDate(date), "d. M. yyyy")

const formatShortDate = (date: string) => format(parseQuizDate(date), "d. M.", { locale: cs })

const pluralizeReservations = (count: number) => {
  if (count === 1) return "rezervace"
  if (count >= 2 && count <= 4) return "rezervace"
  return "rezervací"
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("cs-CZ")

export const TeamReservationLookup = ({ teams }: Props) => {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredTeams = useMemo(() => {
    const n = normalize(query)
    if (!n) return teams
    return teams.filter((team) => normalize(team.teamName).includes(n))
  }, [query, teams])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [])

  const selectedTeam = selectedTeamName
    ? teams.find((team) => team.teamName === selectedTeamName) ?? null
    : null

  const selectTeam = (teamName: string) => {
    setSelectedTeamName(teamName)
    setQuery(teamName)
    setIsOpen(false)
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
        selectTeam(activeTeam.teamName)
      }
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Najít tým</h2>
        <span className="text-xs font-semibold text-white/45">
          Kdy tým hraje příští kvíz
        </span>
      </div>

      <div className="flex w-full flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-sky-950/10 sm:flex-row sm:items-center">
        <label
          htmlFor="kvizy-team-select"
          className="flex shrink-0 items-center gap-2 text-sm font-medium text-white/68"
        >
          <Users className="h-4 w-4 text-sky-100/72" />
          Zobrazit tým
        </label>

        <div ref={containerRef} className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/42">
            <Search className="h-4 w-4" />
          </div>

          <input
            ref={inputRef}
            id="kvizy-team-select"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="kvizy-team-options"
            aria-expanded={isOpen}
            aria-activedescendant={
              isOpen && filteredTeams[activeIndex]
                ? `kvizy-team-option-${activeIndex}`
                : undefined
            }
            autoComplete="off"
            placeholder="Začni psát název týmu..."
            value={query}
            onFocus={(event) => {
              setIsOpen(true)
              event.target.select()
            }}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
              setIsOpen(true)
            }}
            onKeyDown={handleKeyDown}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-950/55 px-9 pr-10 text-sm font-semibold text-white outline-none transition placeholder:text-white/34 hover:border-sky-200/25 focus:border-sky-200/45 focus:ring-3 focus:ring-sky-200/15"
          />

          <div className="absolute inset-y-0 right-3 flex items-center text-white/54">
            {query ? (
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
              id="kvizy-team-options"
              role="listbox"
              className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-white/10 bg-slate-950/98 p-1 shadow-2xl shadow-black/30 ring-1 ring-sky-100/10"
            >
              {filteredTeams.length > 0 ? (
                filteredTeams.map((team, index) => {
                  const isActive = index === activeIndex
                  const isSelected = team.teamName === selectedTeamName
                  const next = team.reservations[0]

                  return (
                    <button
                      key={team.teamName}
                      id={`kvizy-team-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => {
                        setActiveIndex(index)
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        selectTeam(team.teamName)
                      }}
                      className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? "bg-sky-100/14 text-white"
                          : "text-white/76 hover:bg-white/7 hover:text-white"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{team.teamName}</span>
                        <span className="block text-xs font-medium text-white/42">
                          {team.reservations.length} {pluralizeReservations(team.reservations.length)}
                          {next ? ` · nejbližší ${formatShortDate(next.quizDate)}` : ""}
                        </span>
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="px-3 py-2 text-sm font-medium text-white/48">
                  Žádný tým nenalezen
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {selectedTeam ? (
        <div className="rounded-lg border border-white/10 bg-[#0d141c]/72 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold text-white">{selectedTeam.teamName}</h3>
            <span className="text-xs font-semibold text-white/45">
              {selectedTeam.reservations.length}{" "}
              {pluralizeReservations(selectedTeam.reservations.length)}
            </span>
          </div>
          {selectedTeam.reservations.length > 0 ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {selectedTeam.reservations.map((reservation, index) => (
                <li
                  key={`${reservation.quizDate}-${reservation.pubName}-${index}`}
                  className="rounded-md border border-sky-100/14 bg-sky-100/[0.06] p-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="rounded-md bg-sky-100 px-2 py-0.5 text-sm font-bold capitalize text-slate-950">
                      {formatDateLabel(reservation.quizDate)}
                    </span>
                    <span className="text-xs font-medium text-white/45">
                      {formatFullDate(reservation.quizDate)}
                      {reservation.quizTime ? ` · od ${formatTime(reservation.quizTime)}` : " · čas bude upřesněn"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">
                        <Link href={reservation.pubUrl} className="hover:text-sky-100">
                          {reservation.pubName}
                        </Link>
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-white/55">
                        {reservation.city}
                      </div>
                    </div>
                    <Link
                      href={reservation.reservationUrl}
                      className="inline-flex h-6 shrink-0 items-center justify-center rounded-md border border-white/12 px-2 text-[11px] font-bold text-white/82 transition hover:border-sky-100/40 hover:bg-sky-100/10 hover:text-white"
                    >
                      Rezervace
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm font-medium text-white/48">
              Žádná nadcházející rezervace.
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
}
