import { NextResponse } from "next/server"

import { getAdminSession } from "@/lib/admin-session"
import { getKnownPubNames } from "@/lib/quiz-results"

export const GET = async (request: Request) => {
  try {
    const session = await getAdminSession(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pubNames = await getKnownPubNames()
    return NextResponse.json({ pubNames })
  } catch (error) {
    console.error("pub-names GET route error:", error)
    return NextResponse.json({ error: "Failed to load pub names." }, { status: 500 })
  }
}
