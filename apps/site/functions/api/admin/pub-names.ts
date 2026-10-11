import { getKnownPubNames } from "../../../../../packages/results-data/src/quiz-results"
import { applyDbEnv, isAdmin, json, type ResultsEnv } from "../../_shared/results-db"

export const onRequestGet = async ({ env, request }: { env: ResultsEnv; request: Request }) => {
  try {
    if (!(await isAdmin(request, env))) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    applyDbEnv(env)
    return json({ pubNames: await getKnownPubNames() })
  } catch (error) {
    console.error("pub-names GET error:", error)
    return json({ error: "Failed to load pub names." }, { status: 500 })
  }
}
