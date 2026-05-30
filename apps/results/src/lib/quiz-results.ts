import { unstable_cache } from "next/cache"
import { Pool } from "pg"

export type TeamSummary = {
  teamName: string
  quizCount: number
  firstDate: string
  lastDate: string
  averagePoints: number
  bestPoints: number
  bestPlace: number
}

export type QuizResult = {
  id: string
  teamName: string
  orderInQuiz: number | null
  points: number | null
  quizDate: string
  pub: string | null
  pubUrl: string
  quizDetailsUrl: string | null
  tip56Question: string | null
  doplnovacek: number | null
  clenu: number | null
  maxBodyVKole: number | null
  specialName: string | null
}

export type LeagueStandings = {
  leagueName: string
  periodStart: string
  periodStop: string
  totalRounds: number
  playedRounds: number
  totalPubs: number
  leagueUrl: string | null
  lastResultDate: string | null
  teams: LeagueStandingTeam[]
}

export type LeagueResultPoints = {
  round: number
  points: number
  date: string
}

export type LeagueStandingTeam = {
  teamName: string
  leagueResults: LeagueResultPoints[]
}

let pool: Pool | null = null
const quizResultsCacheSeconds = 300
const longTermLeagueName = "Finále Praha"
const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000

const getDatabaseUrl = () => {
  return process.env.DATABASE_URL?.trim()
}

const getPool = () => {
  const connectionString = getDatabaseUrl()

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing for results app.")
  }

  pool ??= new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    query_timeout: 10000,
    statement_timeout: 10000
  })
  return pool
}

const getQuizDetailsUrl = (quizDetailsId: string | null) => {
  if (!quizDetailsId) {
    return null
  }

  if (/^https?:\/\//i.test(quizDetailsId)) {
    return quizDetailsId
  }

  return `https://www.hospodskykviz.cz/tymy/odehrane-kvizy/${quizDetailsId}`
}

const loadTeamSummaries = async (): Promise<TeamSummary[]> => {
  const result = await getPool().query<{
    team_name: string
    quiz_count: number
    first_date: Date
    last_date: Date
    average_points: string
    best_points: number
    best_place: number
  }>(`
    select
      team_name,
      count(*)::int as quiz_count,
      min(quiz_date) as first_date,
      max(quiz_date) as last_date,
      round(avg(points)::numeric, 2) as average_points,
      max(points) as best_points,
      min(order_in_quiz) as best_place
    from public.quiz_results
    group by team_name
    order by team_name
  `)

  return result.rows.map((row) => ({
    teamName: row.team_name,
    quizCount: row.quiz_count,
    firstDate: row.first_date.toISOString(),
    lastDate: row.last_date.toISOString(),
    averagePoints: Number(row.average_points),
    bestPoints: Number(row.best_points),
    bestPlace: row.best_place
  }))
}

const mapQuizResultRow = (row: {
  id: string
  team_name: string
  order_in_quiz: number | null
  points: number | null
  quiz_date: Date
  pub: string | null
  pub_url: string | null
  quiz_details_id: string | null
  tip_56_question: string | null
  doplnovacek: number | null
  clenu: number | null
  max_body_v_kole: number | null
  league_name: string | null
}): QuizResult => ({
  id: row.id,
  teamName: row.team_name,
  orderInQuiz: row.order_in_quiz,
  points: row.points === null ? null : Number(row.points),
  quizDate: row.quiz_date.toISOString(),
  pub: row.pub,
  pubUrl: row.pub_url ?? "#",
  quizDetailsUrl: getQuizDetailsUrl(row.quiz_details_id),
  tip56Question: row.tip_56_question,
  doplnovacek: row.doplnovacek,
  clenu: row.clenu,
  maxBodyVKole: row.max_body_v_kole === null ? null : Number(row.max_body_v_kole),
  specialName: row.league_name
})

const loadAllTeamResults = async (): Promise<QuizResult[]> => {
  const result = await getPool().query<{
    id: string
    team_name: string
    order_in_quiz: number | null
    points: number | null
    quiz_date: Date
    pub: string | null
    pub_url: string | null
    quiz_details_id: string | null
    tip_56_question: string | null
    doplnovacek: number | null
    clenu: number | null
    max_body_v_kole: number | null
    league_name: string | null
  }>(
    `
      select
        id::text,
        team_name,
        order_in_quiz,
        points,
        quiz_date,
        pub,
        pub_url,
        quiz_details_id,
        tip_56_question,
        doplnovacek,
        clenu,
        max_body_v_kole,
        nullif(trim(league_name), '') as league_name
      from public.quiz_results
      order by team_name, quiz_date desc, id desc
    `
  )

  return result.rows.map(mapQuizResultRow)
}

const loadLongTermLeagueStandings = async (): Promise<LeagueStandings | null> => {
  const leagueResult = await getPool().query<{
    league_name: string
    period_start: Date
    period_stop: Date
    league_url: string | null
  }>(
    `
      select
        league_name,
        period_start,
        period_stop,
        league_url
      from public.quiz_leagues
      where league_name = $1
      order by period_start desc, id desc
      limit 1
    `,
    [longTermLeagueName]
  )

  const league = leagueResult.rows[0]

  if (!league) {
    return null
  }

  const standingsResult = await getPool().query<{
    team_name: string
    league_results: LeagueResultPoints[]
  }>(
    `
      with results_in_league as (
        select
          team_name,
          (coalesce(points, 0) - coalesce(doplnovacek, 0))::float8 as league_points,
          quiz_date,
          id,
          floor((quiz_date - $1::date)::numeric / 7)::int as league_week
        from public.quiz_results
        where quiz_date between $1 and $2
          and nullif(trim(league_name), '') is null
      ),
      picked_results as (
        select distinct on (team_name, league_week)
          team_name,
          league_points,
          quiz_date,
          id,
          league_week + 1 as league_round
        from results_in_league
        order by team_name, league_week, quiz_date desc, id desc
      ),
      team_totals as (
        select
          team_name,
          coalesce(
            json_agg(
              json_build_object('round', league_round, 'points', league_points, 'date', quiz_date)
              order by league_round, quiz_date, id
            ),
            '[]'::json
          ) as league_results
        from picked_results
        group by team_name
      )
      select
        team_totals.team_name,
        team_totals.league_results
      from team_totals
      order by team_name
    `,
    [league.period_start, league.period_stop]
  )

  const [pubsResult, lastResultResult] = await Promise.all([
    getPool().query<{ total_pubs: number }>(
      `
        select count(distinct nullif(trim(regexp_replace(trim(pub), '\s+(PO|ÚT|ST|ČT|PÁ|SO|NE)$', '')), ''))::int as total_pubs
        from public.quiz_results
        where quiz_date between $1 and $2
          and nullif(trim(league_name), '') is null
      `,
      [league.period_start, league.period_stop]
    ),
    getPool().query<{ last_result_date: Date | null }>(
      `select max(updated_at) as last_result_date from public.quiz_results`
    )
  ])

  const teams = standingsResult.rows.map((row) => ({
    teamName: row.team_name,
    leagueResults: row.league_results.map((result) => ({
      round: Number(result.round),
      points: Number(result.points),
      date: new Date(result.date).toISOString()
    }))
  }))

  const lastResultDate = lastResultResult.rows[0]?.last_result_date
    ? lastResultResult.rows[0].last_result_date.toISOString()
    : null

  return {
    leagueName: league.league_name,
    periodStart: league.period_start.toISOString(),
    periodStop: league.period_stop.toISOString(),
    totalRounds:
      Math.floor(
        (league.period_stop.getTime() - league.period_start.getTime()) / millisecondsPerWeek
      ) + 1,
    playedRounds: Math.max(
      0,
      ...teams.flatMap((team) => team.leagueResults.map((result) => result.round))
    ),
    totalPubs: pubsResult.rows[0]?.total_pubs ?? 0,
    leagueUrl: league.league_url,
    lastResultDate,
    teams
  }
}

export const getTeamSummaries = unstable_cache(
  loadTeamSummaries,
  ["quiz-results", "team-summaries"],
  {
    revalidate: quizResultsCacheSeconds,
    tags: ["quiz-results"]
  }
)

const getAllTeamResults = unstable_cache(loadAllTeamResults, ["quiz-results", "all-team-results"], {
  revalidate: quizResultsCacheSeconds,
  tags: ["quiz-results"]
})

export const getTeamResults = async (teamName: string) => {
  const results = await getAllTeamResults()
  return results.filter((result) => result.teamName === teamName)
}

export const getLongTermLeagueStandings = unstable_cache(
  loadLongTermLeagueStandings,
  ["quiz-results", "long-term-league-standings"],
  {
    revalidate: quizResultsCacheSeconds,
    tags: ["quiz-results"]
  }
)
