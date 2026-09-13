import { NextResponse } from "next/server"

import { getAdminSession } from "@/lib/admin-session"
import { getKnownTeams } from "@/lib/quiz-results"

export const GET = async (request: Request) => {
  try {
    const session = await getAdminSession(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teams = await getKnownTeams()
    return NextResponse.json({ teams })
  } catch (error) {
    console.error("teams GET route error:", error)
    return NextResponse.json({ error: "Failed to load teams." }, { status: 500 })
  }
}
