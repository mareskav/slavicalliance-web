#!/usr/bin/env node
// Test push notifications by sending to all enabled subscriptions.
// Automatically disables subscriptions that return HTTP 410 / 404.
//
// Usage (from repo root):
//   node --env-file=.env.local scripts/test-push.mjs "Titulek" "Text zprávy"

import webpush from "web-push"
import pg from "pg"

const { Pool } = pg

const required = ["DATABASE_URL", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]
const missing = required.filter((k) => !process.env[k]?.trim())
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`)
  process.exit(1)
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT?.trim() ?? "mailto:admin@slavicalliance.cz",
  process.env.VAPID_PUBLIC_KEY.trim(),
  process.env.VAPID_PRIVATE_KEY.trim()
)

const pool = new Pool({ connectionString: process.env.DATABASE_URL.trim() })

const { rows } = await pool.query(
  "SELECT endpoint, p256dh, auth FROM public.push_subscriptions WHERE enabled = TRUE"
)

if (rows.length === 0) {
  console.log("No enabled subscriptions found.")
  await pool.end()
  process.exit(0)
}

console.log(`Sending push to ${rows.length} subscription(s)…`)

const title = process.argv[2] ?? "Slavic Alliance – Test"
const body = process.argv[3] ?? "Výsledky byly aktualizovány."
const payload = JSON.stringify({ title, body, url: "/vysledky" })

let sent = 0, expired = 0, failed = 0

await Promise.all(
  rows.map(async (row) => {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        payload
      )
      sent++
    } catch (err) {
      const statusCode = err?.statusCode
      if (statusCode === 410 || statusCode === 404) {
        expired++
        await pool
          .query(
            "UPDATE public.push_subscriptions SET enabled = FALSE, updated_at = NOW() WHERE endpoint = $1",
            [row.endpoint]
          )
          .catch(() => {})
        console.log(`  Expired (${statusCode}): ${row.endpoint.slice(0, 60)}…`)
      } else {
        failed++
        console.error(`  Error: ${err?.message ?? err}`)
      }
    }
  })
)

console.log(`Done — sent: ${sent}, expired & disabled: ${expired}, failed: ${failed}`)

await pool.end()
