import { Pool } from "pg"

interface Env {
  DATABASE_URL?: string
}

interface QuizPubReservation {
  id: string
  city: string
  pubName: string
  pubUrl: string
  reservationUrl: string
  quizDate: string
  quizTime: string | null
  teamName: string
  membersCount: number
  registeredTeamsCount: number | null
  freeTablesCount: number | null
  totalTablesCount: number | null
  scrapedAt: string
}

interface TopTeamNextReservation {
  placement: number
  teamName: string
  leaguePoints: number
  next: {
    quizDate: string
    quizTime: string | null
    city: string
    pubName: string
    pubUrl: string
    reservationUrl: string
  } | null
}

const longTermLeagueName = "Finále Praha"
const topTeamsLimit = 10

let pool: Pool | null = null

const getPool = (connectionString: string): Pool => {
  pool ??= new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    query_timeout: 10000,
    statement_timeout: 10000,
    max: 5
  })
  return pool
}

const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, stale-while-revalidate=60",
      ...init?.headers
    }
  })

export const onRequestGet = async ({ env }: { env: Env }) => {
  const databaseUrl = env.DATABASE_URL?.trim()

  if (!databaseUrl) {
    return json({ error: "DATABASE_URL is not configured." }, { status: 503 })
  }

  try {
    const db = getPool(databaseUrl)

    const [reservationsResult, topTeamsResult] = await Promise.all([
      db.query<{
        id: string
        city: string
        pub_name: string
        pub_url: string
        reservation_url: string
        quiz_date: string
        quiz_time: string | null
        team_name: string
        members_count: number
        registered_teams_count: number | null
        free_tables_count: number | null
        total_tables_count: number | null
        scraped_at: Date
      }>(`
        select
          id::text,
          city,
          pub_name,
          pub_url,
          reservation_url,
          quiz_date::text,
          quiz_time::text,
          team_name,
          members_count,
          registered_teams_count,
          free_tables_count,
          total_tables_count,
          scraped_at
        from public.quiz_pub_reservations
        where quiz_date >= current_date
        order by quiz_date, coalesce(quiz_time, '23:59'::time), city, pub_name, team_name, id
        limit 800
      `),
      db.query<{
        placement: number
        team_name: string
        total_points: string | null
        quiz_date: string | null
        quiz_time: string | null
        city: string | null
        pub_name: string | null
        pub_url: string | null
        reservation_url: string | null
      }>(
        `
          with league as (
            select league_name, period_start, period_stop
            from public.quiz_leagues
            where league_name = $1
            order by period_start desc, id desc
            limit 1
          ),
          results_in_league as (
            select
              qr.team_name,
              (coalesce(qr.points, 0) - coalesce(qr.doplnovacek, 0))::float8 as league_points,
              qr.quiz_date,
              qr.id,
              floor((qr.quiz_date - l.period_start::date)::numeric / 7)::int as league_week
            from public.quiz_results qr
            cross join league l
            where qr.quiz_date between l.period_start and l.period_stop
              and nullif(trim(qr.league_name), '') is null
          ),
          picked_results as (
            select distinct on (team_name, league_week)
              team_name,
              league_points,
              quiz_date,
              id
            from results_in_league
            order by team_name, league_week, quiz_date desc, id desc
          ),
          team_totals as (
            select team_name, sum(league_points)::float8 as total_points
            from picked_results
            group by team_name
          ),
          top_teams as (
            select
              team_name,
              total_points,
              row_number() over (order by total_points desc, team_name) as placement
            from team_totals
            order by total_points desc, team_name
            limit $2
          ),
          next_reservation as (
            select distinct on (r.team_name)
              r.team_name,
              r.quiz_date::text as quiz_date,
              r.quiz_time::text as quiz_time,
              r.city,
              r.pub_name,
              r.pub_url,
              r.reservation_url
            from public.quiz_pub_reservations r
            where r.quiz_date >= current_date
              and r.team_name in (select team_name from top_teams)
            order by r.team_name, r.quiz_date, coalesce(r.quiz_time, '23:59'::time), r.id
          )
          select
            t.placement::int as placement,
            t.team_name,
            t.total_points::text as total_points,
            n.quiz_date,
            n.quiz_time,
            n.city,
            n.pub_name,
            n.pub_url,
            n.reservation_url
          from top_teams t
          left join next_reservation n on n.team_name = t.team_name
          order by t.placement, t.team_name
        `,
        [longTermLeagueName, topTeamsLimit]
      )
    ])

    const reservations: QuizPubReservation[] = reservationsResult.rows.map((row) => ({
      id: row.id,
      city: row.city,
      pubName: row.pub_name,
      pubUrl: row.pub_url,
      reservationUrl: row.reservation_url,
      quizDate: row.quiz_date,
      quizTime: row.quiz_time,
      teamName: row.team_name,
      membersCount: row.members_count,
      registeredTeamsCount: row.registered_teams_count,
      freeTablesCount: row.free_tables_count,
      totalTablesCount: row.total_tables_count,
      scrapedAt: row.scraped_at.toISOString()
    }))

    const topTeams: TopTeamNextReservation[] = topTeamsResult.rows.map((row) => ({
      placement: row.placement,
      teamName: row.team_name,
      leaguePoints: row.total_points ? Number(row.total_points) : 0,
      next:
        row.quiz_date && row.city && row.pub_name && row.pub_url && row.reservation_url
          ? {
              quizDate: row.quiz_date,
              quizTime: row.quiz_time,
              city: row.city,
              pubName: row.pub_name,
              pubUrl: row.pub_url,
              reservationUrl: row.reservation_url
            }
          : null
    }))

    return json({ reservations, topTeams })
  } catch (error) {
    console.error("quiz-reservations error:", error)
    return json({ error: "Failed to load quiz reservations." }, { status: 500 })
  }
}
