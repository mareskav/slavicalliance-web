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

let pool: Pool | null = null
const quizResultsCacheSeconds = 300

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
    quiz_details_url: string | null
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
        quiz_details_url,
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
    quizDetailsUrl: row.quiz_details_url,
    tip56Question: row.tip_56_question,
    doplnovacek: row.doplnovacek,
    clenu: row.clenu,
    maxBodyVKole: row.max_body_v_kole === null ? null : Number(row.max_body_v_kole),
  }))
}

export const getTeamSummaries = unstable_cache(loadTeamSummaries, ["quiz-results", "team-summaries"], {
  revalidate: quizResultsCacheSeconds,
  tags: ["quiz-results"],
})

export const getTeamResults = unstable_cache(loadTeamResults, ["quiz-results", "team-results"], {
  revalidate: quizResultsCacheSeconds,
  tags: ["quiz-results"],
})
