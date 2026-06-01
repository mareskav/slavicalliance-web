"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { format, isToday, isTomorrow, parseISO } from "date-fns"
import { cs } from "date-fns/locale"

import type { TopTeamNextReservation } from "@/lib/quiz-reservations"

type SortKey = "placement" | "date"

type Props = {
  teams: TopTeamNextReservation[]
}

const parseQuizDate = (date: string) => parseISO(`${date}T12:00:00`)

const formatTime = (time: string | null) => (time ? time.slice(0, 5) : "Čas bude upřesněn")

const formatTopTeamDate = (date: string) => {
  const parsed = parseQuizDate(date)
  return isToday(parsed)
    ? "Dnes"
    : isTomorrow(parsed)
      ? "Zítra"
      : format(parsed, "EEEE d. M.", { locale: cs })
}

const TopTeamCard = ({ team }: { team: TopTeamNextReservation }) => (
  <article className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#0d141c]/72 p-4">
    <div className="flex items-start gap-3">
      <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-sky-100/15 px-2 text-sm font-bold text-sky-50 ring-1 ring-sky-100/25">
        {team.placement}.
      </span>
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold text-white">{team.teamName}</h3>
      </div>
    </div>

    {team.next ? (
      <div className="rounded-md border border-sky-100/14 bg-sky-100/6 p-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="rounded-md bg-sky-100 px-2 py-0.5 text-sm font-bold capitalize text-slate-950">
            {formatTopTeamDate(team.next.quizDate)}
          </span>
          <span className="text-xs font-medium text-white/45">
            {team.next.quizTime ? `od ${formatTime(team.next.quizTime)}` : "Čas bude upřesněn"}
          </span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">
              <Link href={team.next.pubUrl} className="hover:text-sky-100">
                {team.next.pubName}
              </Link>
            </div>
            <div className="mt-0.5 text-xs font-medium text-white/55">{team.next.city}</div>
          </div>
          <Link
            href={team.next.reservationUrl}
            className="inline-flex h-6 shrink-0 items-center justify-center rounded-md border border-white/12 px-2 text-[11px] font-bold text-white/82 transition hover:border-sky-100/40 hover:bg-sky-100/10 hover:text-white"
          >
            Rezervace
          </Link>
        </div>
      </div>
    ) : (
      <div className="rounded-md border border-white/8 bg-white/[0.03] p-3 text-xs font-medium text-white/45">
        Žádná nadcházející rezervace.
      </div>
    )}
  </article>
)

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "placement", label: "Umístění" },
  { key: "date", label: "Datum kvízu" }
]

export const TopTeamsList = ({ teams }: Props) => {
  const [sortKey, setSortKey] = useState<SortKey>("placement")

  const sortedTeams = useMemo(() => {
    if (sortKey === "placement") {
      return [...teams].sort((a, b) => a.placement - b.placement)
    }

    return [...teams].sort((a, b) => {
      if (!a.next && !b.next) return a.placement - b.placement
      if (!a.next) return 1
      if (!b.next) return -1
      const dateCompare = a.next.quizDate.localeCompare(b.next.quizDate)
      if (dateCompare !== 0) return dateCompare
      const aTime = a.next.quizTime ?? "23:59"
      const bTime = b.next.quizTime ?? "23:59"
      const timeCompare = aTime.localeCompare(bTime)
      if (timeCompare !== 0) return timeCompare
      return a.placement - b.placement
    })
  }, [teams, sortKey])

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-bold text-white">Top 10 dlouhodobky</h2>
          <span className="hidden text-xs font-semibold text-white/45 sm:inline">
            Finále Praha — kdy se hraje příště
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="text-sm font-semibold text-white/58">Řadit dle</span>
          <div
            className="inline-flex h-10 shrink-0 rounded-lg border border-white/10 bg-white/5 p-1"
            role="tablist"
            aria-label="Řazení Top 10"
          >
            {sortOptions.map((option) => {
              const isActive = option.key === sortKey
              return (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSortKey(option.key)}
                  className={`inline-flex items-center justify-center rounded-md px-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-sky-300/28 text-white shadow-sm shadow-sky-950/30 ring-1 ring-sky-100/38"
                      : "text-white/58 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {sortedTeams.map((team) => (
          <TopTeamCard key={team.teamName} team={team} />
        ))}
      </div>
    </section>
  )
}
