"use client"

import { useEffect, useState } from "react"
import { addWeeks, endOfWeek, format, startOfWeek } from "date-fns"

import type { QuizPubReservation, TopTeamNextReservation } from "@/lib/quiz-reservations"
import { TeamReservationLookup, type TeamReservationOption } from "./TeamReservationLookup"
import { TopTeamsList } from "./TopTeamsList"

const weekStartsOn = 1 as const

const toIsoDate = (date: Date) => format(date, "yyyy-MM-dd")

const formatScrapedAt = (value: string) =>
  new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value))

const countTeamsInRange = (reservations: QuizPubReservation[], startIso: string, endIso: string) =>
  new Set(
    reservations
      .filter((r) => r.quizDate >= startIso && r.quizDate <= endIso)
      .map((r) => r.teamName)
  ).size

const getLatestScrape = (reservations: QuizPubReservation[]) =>
  reservations.reduce<string | null>((latest, r) => {
    if (!latest || new Date(r.scrapedAt).getTime() > new Date(latest).getTime()) {
      return r.scrapedAt
    }
    return latest
  }, null)

const groupReservationsByTeam = (reservations: QuizPubReservation[]): TeamReservationOption[] => {
  const map = new Map<string, TeamReservationOption>()

  for (const reservation of reservations) {
    const bundle =
      map.get(reservation.teamName) ??
      ({ teamName: reservation.teamName, reservations: [] } satisfies TeamReservationOption)

    bundle.reservations.push({
      quizDate: reservation.quizDate,
      quizTime: reservation.quizTime,
      city: reservation.city,
      pubName: reservation.pubName,
      pubUrl: reservation.pubUrl,
      reservationUrl: reservation.reservationUrl
    })
    map.set(reservation.teamName, bundle)
  }

  return Array.from(map.values()).sort((a, b) => a.teamName.localeCompare(b.teamName, "cs-CZ"))
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.045] px-4 py-3">
    <div className="text-xs font-semibold uppercase text-white/42">{label}</div>
    <div className="mt-1 text-2xl font-bold text-white">{value}</div>
  </div>
)

export const QuizReservationsClient = () => {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ok"; reservations: QuizPubReservation[]; topTeams: TopTeamNextReservation[] }
  >({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()

    fetch("/api/quiz-reservations", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{
          reservations: QuizPubReservation[]
          topTeams: TopTeamNextReservation[]
        }>
      })
      .then((data) => setState({ status: "ok", reservations: data.reservations, topTeams: data.topTeams }))
      .catch(() => setState({ status: "error" }))

    return () => controller.abort()
  }, [])

  if (state.status === "loading") {
    return (
      <div className="space-y-10">
        <section className="grid grid-cols-2 gap-3">
          <div className="h-[72px] animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" />
          <div className="h-[72px] animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" />
        </section>
        <div className="h-64 animate-pulse rounded-lg border border-white/10 bg-white/[0.045]" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-8">
        <p className="text-white/62">
          Rezervace se teď nepodařilo načíst. Zkontroluj DATABASE_URL nebo dostupnost databáze.
        </p>
      </section>
    )
  }

  const { reservations, topTeams } = state
  const latestScrape = getLatestScrape(reservations)
  const teamBundles = groupReservationsByTeam(reservations)
  const today = new Date()
  const thisWeekStartIso = toIsoDate(startOfWeek(today, { weekStartsOn }))
  const thisWeekEndIso = toIsoDate(endOfWeek(today, { weekStartsOn }))
  const nextWeekStartIso = toIsoDate(startOfWeek(addWeeks(today, 1), { weekStartsOn }))
  const nextWeekEndIso = toIsoDate(endOfWeek(addWeeks(today, 1), { weekStartsOn }))
  const thisWeekTeamCount = countTeamsInRange(reservations, thisWeekStartIso, thisWeekEndIso)
  const nextWeekTeamCount = countTeamsInRange(reservations, nextWeekStartIso, nextWeekEndIso)

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-3">
        {latestScrape ? (
          <p className="col-span-2 text-sm text-white/40">
            Data aktualizována {formatScrapedAt(latestScrape)}.
          </p>
        ) : null}
        <Stat label="Týmů tento týden" value={String(thisWeekTeamCount)} />
        <Stat label="Týmů příští týden" value={String(nextWeekTeamCount)} />
      </div>

      <TeamReservationLookup teams={teamBundles} />
      {topTeams.length > 0 ? <TopTeamsList teams={topTeams} /> : null}
    </div>
  )
}
