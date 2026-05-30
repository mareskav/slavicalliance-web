import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"

import { disablePushSubscription, getEnabledSubscriptions } from "@/lib/push-db"

type TestBody = {
  title?: string
  body?: string
}

type WebPushError = Error & { statusCode?: number }

const configureVapid = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim() ?? "mailto:admin@slavicalliance.cz"

  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set.")
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

const sendOne = async (endpoint: string, p256dh: string, auth: string, payload: string) => {
  try {
    await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload)
  } catch (err) {
    const statusCode = (err as WebPushError).statusCode
    if (statusCode === 410 || statusCode === 404) {
      // Subscription is gone — disable silently so future sends skip it.
      await disablePushSubscription(endpoint).catch(() => {})
    }
    throw err
  }
}

export const POST = async (req: NextRequest) => {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim()
  const authHeader = req.headers.get("authorization")

  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    configureVapid()
  } catch {
    return NextResponse.json({ error: "VAPID keys not configured." }, { status: 500 })
  }

  const body = (await req.json().catch(() => ({}))) as TestBody

  const payload = JSON.stringify({
    title: body.title ?? "Slavic Alliance – Test",
    body: body.body ?? "Testovací push notifikace.",
    url: "/vysledky"
  })

  const subscriptions = await getEnabledSubscriptions()

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendOne(sub.endpoint, sub.p256dh, sub.auth, payload))
  )

  const sent = results.filter((r) => r.status === "fulfilled").length
  const expired = results.filter(
    (r) => r.status === "rejected" && [410, 404].includes((r.reason as WebPushError).statusCode ?? 0)
  ).length
  const failed = results.filter((r) => r.status === "rejected").length - expired

  return NextResponse.json({ sent, expired, failed, total: subscriptions.length })
}
