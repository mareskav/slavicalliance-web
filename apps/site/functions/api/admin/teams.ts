import { getKnownTeams } from "../../../../../packages/results-data/src/quiz-results"
import { applyDbEnv, isAdmin, json, type ResultsEnv } from "../../_shared/results-db"

export const onRequestGet = async ({ env, request }: { env: ResultsEnv; request: Request }) => {
  try {
    if (!(await isAdmin(request, env))) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    applyDbEnv(env)
    return json({ teams: await getKnownTeams() })
  } catch (error) {
    console.error("teams GET error:", error)
    return json({ error: "Failed to load teams." }, { status: 500 })
  }
}
