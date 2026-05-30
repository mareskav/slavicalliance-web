import { NextRequest, NextResponse } from "next/server"

import { disablePushSubscription } from "@/lib/push-db"

export const POST = async (req: NextRequest) => {
  try {
    const { endpoint } = (await req.json()) as { endpoint?: string }

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint is required." }, { status: 400 })
    }

    await disablePushSubscription(endpoint)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("push/unsubscribe error:", error)
    return NextResponse.json({ error: "Failed to unsubscribe." }, { status: 500 })
  }
}
