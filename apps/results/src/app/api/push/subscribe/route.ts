import { NextRequest, NextResponse } from "next/server"

import { upsertPushSubscription } from "@/lib/push-db"

type SubscribeBody = {
  subscription: {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }
  platform?: string
  userAgent?: string
  teamName?: string | null
  notificationType?: string
}

export const POST = async (req: NextRequest) => {
  try {
    const body = (await req.json()) as SubscribeBody

    const { subscription, platform, userAgent, teamName, notificationType } = body

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription object." }, { status: 400 })
    }

    await upsertPushSubscription({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      platform: platform ?? null,
      userAgent: userAgent ?? null,
      teamName: teamName ?? null,
      notificationType: notificationType ?? "results"
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("push/subscribe error:", error)
    return NextResponse.json({ error: "Failed to save subscription." }, { status: 500 })
  }
}
