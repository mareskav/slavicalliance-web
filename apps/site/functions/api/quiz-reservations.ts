import {
  getTopTeamsNextReservations,
  getUpcomingQuizReservations
} from "../../../../packages/results-data/src/quiz-reservations"
import { applyDbEnv, json, type ResultsEnv } from "../_shared/results-db"

const cacheControl = "public, max-age=300, stale-while-revalidate=60"

interface Context {
  env: ResultsEnv
  request: Request
  waitUntil: (promise: Promise<unknown>) => void
}

// Edge-cached for 5 minutes so public traffic doesn't wake Neon on every view
// (replaces the unstable_cache of the old Next route).
export const onRequestGet = async ({ env, request, waitUntil }: Context) => {
  const cache = (caches as unknown as { default: Cache }).default
  const cacheKey = new Request(new URL(request.url).origin + "/api/quiz-reservations", { method: "GET" })
  const cached = await cache.match(cacheKey)

  if (cached) {
    return cached
  }

  try {
    applyDbEnv(env)
    const [reservations, topTeams] = await Promise.all([
      getUpcomingQuizReservations(),
      getTopTeamsNextReservations()
    ])
    const response = json({ reservations, topTeams }, { headers: { "Cache-Control": cacheControl } })

    waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    console.error("quiz-reservations error:", error)
    return json({ error: "Failed to load quiz reservations." }, { status: 500 })
  }
}
