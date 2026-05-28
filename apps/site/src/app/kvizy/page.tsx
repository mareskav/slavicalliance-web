import type { Metadata } from "next"
import { addWeeks, endOfWeek, format, startOfWeek } from "date-fns"
import { cs } from "date-fns/locale"

import {
  getTopTeamsNextReservations,
  getUpcomingQuizReservations,
  type QuizPubReservation,
  type TopTeamNextReservation
} from "@/lib/quiz-reservations"
import { TeamReservationLookup, type TeamReservationOption } from "./TeamReservationLookup"
import { TopTeamsList } from "./TopTeamsList"

export const metadata: Metadata = {
  title: "Kvízy",
  description: "Najdi, kdy jdou týmy na Hospodský kvíz."
}

const formatScrapedAt = (value: string) =>
  format(new Date(value), "d. M. yyyy HH:mm", { locale: cs })

const weekStartsOn = 1 as const

const toIsoDate = (date: Date) => format(date, "yyyy-MM-dd")

const countTeamsInRange = (reservations: QuizPubReservation[], startIso: string, endIso: string) =>
  new Set(
    reservations
      .filter((reservation) => reservation.quizDate >= startIso && reservation.quizDate <= endIso)
      .map((reservation) => reservation.teamName)
  ).size

const getLatestScrape = (reservations: QuizPubReservation[]) =>
  reservations.reduce<string | null>((latest, reservation) => {
    if (!latest || new Date(reservation.scrapedAt).getTime() > new Date(latest).getTime()) {
      return reservation.scrapedAt
    }

    return latest
  }, null)

const groupReservationsByTeam = (reservations: QuizPubReservation[]): TeamReservationOption[] => {
  const map = new Map<string, TeamReservationOption>()

  for (const reservation of reservations) {
    const bundle =
      map.get(reservation.teamName) ??
      ({
        teamName: reservation.teamName,
        reservations: []
      } satisfies TeamReservationOption)

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

const KvizyPage = async () => {
  let reservations: QuizPubReservation[]
  let topTeams: TopTeamNextReservation[]

  try {
    ;[reservations, topTeams] = await Promise.all([
      getUpcomingQuizReservations(),
      getTopTeamsNextReservations()
    ])
  } catch (error) {
    console.error(error)
    return (
      <div className="font-sans">
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-8">
          <h1 className="text-4xl font-bold text-white">Kvízy</h1>
          <p className="mt-3 max-w-2xl text-white/62">
            Rezervace se teď nepodařilo načíst. Zkontroluj DATABASE_URL nebo dostupnost databáze.
          </p>
        </section>
      </div>
    )
  }

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
    <div className="space-y-10 font-sans">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div>
          <div className="text-sm font-bold uppercase text-sky-100/60">Hospodský kvíz</div>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Kvízy</h1>
          <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-white/62 sm:text-lg">
            Najdi, kdy jdou jednotlivé týmy na Hospodský kvíz.
          </p>
          {latestScrape ? (
            <p className="mt-3 text-sm font-medium text-white/42">
              Data aktualizována {formatScrapedAt(latestScrape)}.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Týmů tento týden" value={String(thisWeekTeamCount)} />
          <Stat label="Týmů příští týden" value={String(nextWeekTeamCount)} />
        </div>
      </section>

      <TeamReservationLookup teams={teamBundles} />
      {topTeams.length > 0 ? <TopTeamsList teams={topTeams} /> : null}
    </div>
  )
}

export default KvizyPage
