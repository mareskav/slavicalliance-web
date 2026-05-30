import { Pool } from "pg"
import webpush from "web-push"

import { disablePushSubscription, getEnabledSubscriptions } from "./push-db"

// Dedicated pool — bypasses Next.js unstable_cache so we always see live DB state.
let pool: Pool | null = null

const getPool = (): Pool => {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) throw new Error("DATABASE_URL is missing.")
  pool ??= new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    query_timeout: 10000,
    statement_timeout: 10000
  })
  return pool
}

type TopTeamRow = {
  placement: number
  teamName: string
  leaguePoints: number
  nextQuizDate: string | null
  nextPubName: string | null
}

// Same logic as loadTopTeamsNextReservations in quiz-reservations.ts but uncached
// and returning only the fields needed for change detection and notification text.
const loadCurrentTopTeams = async (): Promise<TopTeamRow[]> => {
  const result = await getPool().query<{
    placement: number
    team_name: string
    total_points: string | null
    quiz_date: string | null
    pub_name: string | null
  }>(
    `
    WITH league AS (
      SELECT period_start, period_stop
      FROM public.quiz_leagues
      WHERE league_name = 'Finále Praha'
      ORDER BY period_start DESC, id DESC
      LIMIT 1
    ),
    results_in_league AS (
      SELECT
        qr.team_name,
        (COALESCE(qr.points, 0) - COALESCE(qr.doplnovacek, 0))::float8 AS league_points,
        qr.quiz_date, qr.id,
        FLOOR((qr.quiz_date - l.period_start::date)::numeric / 7)::int AS league_week
      FROM public.quiz_results qr
      CROSS JOIN league l
      WHERE qr.quiz_date BETWEEN l.period_start AND l.period_stop
        AND nullif(TRIM(qr.league_name), '') IS NULL
    ),
    picked_results AS (
      SELECT DISTINCT ON (team_name, league_week)
        team_name, league_points
      FROM results_in_league
      ORDER BY team_name, league_week, quiz_date DESC, id DESC
    ),
    team_totals AS (
      SELECT team_name, SUM(league_points)::float8 AS total_points
      FROM picked_results
      GROUP BY team_name
    ),
    top_teams AS (
      SELECT
        team_name,
        total_points,
        ROW_NUMBER() OVER (ORDER BY total_points DESC, team_name) AS placement
      FROM team_totals
      ORDER BY total_points DESC, team_name
      LIMIT 10
    ),
    next_reservation AS (
      SELECT DISTINCT ON (r.team_name)
        r.team_name,
        r.quiz_date::text AS quiz_date,
        r.pub_name
      FROM public.quiz_pub_reservations r
      WHERE r.quiz_date >= CURRENT_DATE
        AND r.team_name IN (SELECT team_name FROM top_teams)
      ORDER BY r.team_name, r.quiz_date, COALESCE(r.quiz_time, '23:59'::time), r.id
    )
    SELECT
      t.placement::int,
      t.team_name,
      t.total_points::text,
      n.quiz_date,
      n.pub_name
    FROM top_teams t
    LEFT JOIN next_reservation n ON n.team_name = t.team_name
    ORDER BY t.placement, t.team_name
    `
  )

  return result.rows.map((row) => ({
    placement: row.placement,
    teamName: row.team_name,
    leaguePoints: row.total_points ? Number(row.total_points) : 0,
    nextQuizDate: row.quiz_date ?? null,
    nextPubName: row.pub_name ?? null
  }))
}

// Stable string representation of top 10 league standings.
// Changes when: any team enters/leaves top 10, positions change, or point totals change.
const leagueSnapshot = (teams: TopTeamRow[]): string =>
  teams.map((t) => `${t.placement}:${t.teamName}:${t.leaguePoints}`).join("|")

// Stable string representation of top 10 teams' next reservations.
// Changes when: any team's next pub or date changes.
const reservationsSnapshot = (teams: TopTeamRow[]): string =>
  teams.map((t) => `${t.teamName}:${t.nextQuizDate ?? ""}:${t.nextPubName ?? ""}`).join("|")

const getSnapshot = async (key: string): Promise<string | null> => {
  const result = await getPool().query<{ snapshot: string }>(
    "SELECT snapshot FROM public.push_notification_snapshots WHERE key = $1",
    [key]
  )
  return result.rows[0]?.snapshot ?? null
}

const saveSnapshot = async (key: string, value: string): Promise<void> => {
  await getPool().query(
    `INSERT INTO public.push_notification_snapshots (key, snapshot, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()`,
    [key, value]
  )
}

const formatCzechDate = (isoDate: string): string => {
  const [, m, d] = isoDate.split("-")
  return `${parseInt(d, 10)}. ${parseInt(m, 10)}.`
}

type PushStats = { sent: number; expired: number; failed: number }
type WebPushError = Error & { statusCode?: number }

const sendToAll = async (payload: string): Promise<PushStats> => {
  const subs = await getEnabledSubscriptions()
  let sent = 0, expired = 0, failed = 0

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err) {
        const code = (err as WebPushError).statusCode
        if (code === 410 || code === 404) {
          expired++
          await disablePushSubscription(sub.endpoint).catch(() => {})
        } else {
          failed++
        }
      }
    })
  )

  return { sent, expired, failed }
}

const configureVapid = (): void => {
  const pub = process.env.VAPID_PUBLIC_KEY?.trim()
  const priv = process.env.VAPID_PRIVATE_KEY?.trim()
  const sub = process.env.VAPID_SUBJECT?.trim() ?? "mailto:admin@slavicalliance.cz"
  if (!pub || !priv) throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set.")
  webpush.setVapidDetails(sub, pub, priv)
}

export type NotifyResult = {
  leagueChanged: boolean
  reservationsChanged: boolean
  leaguePush: PushStats | null
  reservationsPush: PushStats | null
}

export const runPushNotifyCheck = async (): Promise<NotifyResult> => {
  configureVapid()

  const current = await loadCurrentTopTeams()

  if (current.length === 0) {
    return { leagueChanged: false, reservationsChanged: false, leaguePush: null, reservationsPush: null }
  }

  const newLeagueSnap = leagueSnapshot(current)
  const newReservSnap = reservationsSnapshot(current)

  const [oldLeagueSnap, oldReservSnap] = await Promise.all([
    getSnapshot("league_top10"),
    getSnapshot("reservations_top10")
  ])

  // Empty string = seeded by migration (first run). Treat as "initial state — save but don't notify."
  const leagueChanged = oldLeagueSnap !== null && oldLeagueSnap !== "" && oldLeagueSnap !== newLeagueSnap
  const reservationsChanged = oldReservSnap !== null && oldReservSnap !== "" && oldReservSnap !== newReservSnap

  let leaguePush: PushStats | null = null
  let reservationsPush: PushStats | null = null

  if (leagueChanged) {
    const top3summary = current
      .slice(0, 3)
      .map((t) => `${t.placement}. ${t.teamName} ${t.leaguePoints} b.`)
      .join("  ")

    leaguePush = await sendToAll(
      JSON.stringify({
        title: "Pořadí v Dlouhodobé soutěži se změnilo",
        body: top3summary,
        url: "/vysledky?view=league"
      })
    )
  }

  if (reservationsChanged) {
    const lines = current
      .filter((t) => t.nextQuizDate && t.nextPubName)
      .slice(0, 3)
      .map((t) => `${t.teamName}: ${t.nextPubName} ${formatCzechDate(t.nextQuizDate!)}`)
      .join("  ")

    reservationsPush = await sendToAll(
      JSON.stringify({
        title: "Nové rezervace top týmů",
        body: lines || "Podívej se na rezervace pro top 10 týmů.",
        url: "/kvizy"
      })
    )
  }

  // Always update snapshots (including first real run where old snap was "").
  await Promise.all([
    saveSnapshot("league_top10", newLeagueSnap),
    saveSnapshot("reservations_top10", newReservSnap)
  ])

  return { leagueChanged, reservationsChanged, leaguePush, reservationsPush }
}
