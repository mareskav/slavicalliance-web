import { NextRequest, NextResponse } from "next/server"

import { runPushNotifyCheck } from "@/lib/push-notify"

export const POST = async (req: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = req.headers.get("authorization")

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const result = await runPushNotifyCheck()
    return NextResponse.json(result)
  } catch (error) {
    console.error("push/notify error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 500 }
    )
  }
}
