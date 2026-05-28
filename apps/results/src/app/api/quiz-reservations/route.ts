import { NextResponse } from "next/server"

import { getTopTeamsNextReservations, getUpcomingQuizReservations } from "@/lib/quiz-reservations"

export const GET = async () => {
  try {
    const [reservations, topTeams] = await Promise.all([
      getUpcomingQuizReservations(),
      getTopTeamsNextReservations()
    ])

    return NextResponse.json(
      { reservations, topTeams },
      { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=60" } }
    )
  } catch (error) {
    console.error("quiz-reservations route error:", error)
    return NextResponse.json({ error: "Failed to load quiz reservations." }, { status: 500 })
  }
}
