import fs from "node:fs"
import path from "node:path"
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
}

export type LeagueStandings = {
  leagueName: string
  periodStart: string
  periodStop: string
  totalRounds: number
  leagueUrl: string | null
  teams: LeagueStandingTeam[]
}

export type LeagueStandingTeam = {
  teamName: string
  totalPoints: number
  adjustedTotalPoints: number
  quizCount: number
  lastQuizPoints: number | null
  droppedPoints: number[]
}

let pool: Pool | null = null
const quizResultsCacheSeconds = 300
const longTermLeagueName = "Finále Praha"
const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000

const readEnvFileValue = (filePath: string, key: string) => {
  if (!fs.existsSync(filePath)) {
    return undefined
  }

  const content = fs.readFileSync(filePath, "utf8")
  const line = content
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${key}=`))

  if (!line) {
    return undefined
  }

  const value = line.slice(key.length + 1).trim()
  return value.replace(/^["']|["']$/g, "")
}

const getDatabaseUrl = () => {
  const directUrl = process.env.DATABASE_URL

  if (directUrl) {
    return directUrl
  }

  return (
    readEnvFileValue(path.join(process.cwd(), ".env.local"), "DATABASE_URL") ??
    readEnvFileValue(path.join(process.cwd(), "../../.env.local"), "DATABASE_URL") ??
    readEnvFileValue(path.join(process.cwd(), "../site/.env.local"), "DATABASE_URL")
  )
}

const getPool = () => {
  const connectionString = getDatabaseUrl()

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing for results app.")
  }

  pool ??= new Pool({ connectionString })
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
    bestPlace: row.best_place,
  }))
}

const loadTeamResults = async (teamName: string): Promise<QuizResult[]> => {
  const result = await getPool().query<{
    id: string
    team_name: string
    order_in_quiz: number | null
    points: number | null
    quiz_date: Date
    pub: string | null
    pub_url: string
    quiz_details_id: string | null
    tip_56_question: string | null
    doplnovacek: number | null
    clenu: number | null
    max_body_v_kole: number | null
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
        max_body_v_kole
      from public.quiz_results
      where team_name = $1
      order by quiz_date desc, id desc
    `,
    [teamName],
  )

  return result.rows.map((row) => ({
    id: row.id,
    teamName: row.team_name,
    orderInQuiz: row.order_in_quiz,
    points: row.points === null ? null : Number(row.points),
    quizDate: row.quiz_date.toISOString(),
    pub: row.pub,
    pubUrl: row.pub_url,
    quizDetailsUrl: getQuizDetailsUrl(row.quiz_details_id),
    tip56Question: row.tip_56_question,
    doplnovacek: row.doplnovacek,
    clenu: row.clenu,
    maxBodyVKole: row.max_body_v_kole === null ? null : Number(row.max_body_v_kole),
  }))
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
    [longTermLeagueName],
  )

  const league = leagueResult.rows[0]

  if (!league) {
    return null
  }

  const standingsResult = await getPool().query<{
    team_name: string
    total_points: number
    adjusted_total_points: number
    quiz_count: number
    last_quiz_points: number | null
    dropped_points: number[]
  }>(
    `
      with results_in_league as (
        select
          team_name,
          (coalesce(points, 0) - coalesce(doplnovacek, 0))::float8 as league_points,
          quiz_date,
          id
        from public.quiz_results
        where quiz_date between $1 and $2
          and nullif(trim(league_name), '') is null
      ),
      ranked_results as (
        select
          team_name,
          league_points,
          row_number() over (partition by team_name order by league_points, quiz_date, id) as worst_result_rank
        from results_in_league
      ),
      team_totals as (
        select
          team_name,
          coalesce(sum(league_points), 0)::float8 as total_points,
          coalesce(sum(league_points) filter (where worst_result_rank > 2), 0)::float8 as adjusted_total_points,
          count(*)::int as quiz_count,
          coalesce(array_agg(league_points order by league_points) filter (where worst_result_rank <= 2), array[]::float8[]) as dropped_points
        from ranked_results
        group by team_name
      ),
      latest_team_quiz as (
        select distinct on (team_name)
          team_name,
          league_points as last_quiz_points
        from results_in_league
        order by team_name, quiz_date desc, id desc
      )
      select
        team_totals.team_name,
        team_totals.total_points,
        team_totals.adjusted_total_points,
        team_totals.quiz_count,
        latest_team_quiz.last_quiz_points,
        team_totals.dropped_points
      from team_totals
      left join latest_team_quiz on latest_team_quiz.team_name = team_totals.team_name
      order by total_points desc, team_name
    `,
    [league.period_start, league.period_stop],
  )

  return {
    leagueName: league.league_name,
    periodStart: league.period_start.toISOString(),
    periodStop: league.period_stop.toISOString(),
    totalRounds: Math.floor((league.period_stop.getTime() - league.period_start.getTime()) / millisecondsPerWeek) + 1,
    leagueUrl: league.league_url,
    teams: standingsResult.rows.map((row) => ({
      teamName: row.team_name,
      totalPoints: Number(row.total_points),
      adjustedTotalPoints: Number(row.adjusted_total_points),
      quizCount: row.quiz_count,
      lastQuizPoints: row.last_quiz_points === null ? null : Number(row.last_quiz_points),
      droppedPoints: row.dropped_points.map(Number),
    })),
  }
}

export const getTeamSummaries = unstable_cache(loadTeamSummaries, ["quiz-results", "team-summaries"], {
  revalidate: quizResultsCacheSeconds,
  tags: ["quiz-results"],
})

export const getTeamResults = unstable_cache(loadTeamResults, ["quiz-results", "team-results"], {
  revalidate: quizResultsCacheSeconds,
  tags: ["quiz-results"],
})

export const getLongTermLeagueStandings = unstable_cache(loadLongTermLeagueStandings, ["quiz-results", "long-term-league-standings"], {
  revalidate: quizResultsCacheSeconds,
  tags: ["quiz-results"],
})
