import { unstable_cache } from "next/cache"
import { Pool, type QueryResult, type QueryResultRow } from "pg"

export type TeamSummary = {
  teamId: number | null
  teamKey: string
  teamName: string
  teamPub: string | null
  quizCount: number
  firstDate: string
  lastDate: string
  averagePoints: number
  bestPoints: number
  bestPlace: number
  duplicateNameCount: number
}

export type QuizResult = {
  id: string
  source: "scraped" | "manual"
  teamId: number | null
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
  leagueId: number
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

export type LeagueSummary = {
  leagueId: number
  leagueName: string
  periodStart: string
  periodStop: string
  leagueUrl: string | null
}

export type LeagueResultPoints = {
  round: number
  points: number
  date: string
}

export type LeagueStandingTeam = {
  teamId: number | null
  teamKey: string
  teamName: string
  teamPub: string | null
  duplicateNameCount: number
  leagueResults: LeagueResultPoints[]
}

type LeagueRow = {
  id: number
  league_name: string
  period_start: Date
  period_stop: Date
  league_url: string | null
}

let pool: Pool | null = null
const pragueAutumn2026LeagueUrl = "https://www.hospodskykviz.cz/vysledky/499"
const ignoredFinalePrahaLeagueUrl = "https://www.hospodskykviz.cz/vysledky/461"
const ignoredFinaleJaro2026Url = "https://www.hospodskykviz.cz/vysledky/492"
const ignoredLeagueUrls = [ignoredFinalePrahaLeagueUrl, ignoredFinaleJaro2026Url]
const ignoredLeagueNames = ["Finále Praha", "Finále jaro 2026"]
const specialLeagueUrls = ignoredLeagueUrls
const specialLeagueNames = ignoredLeagueNames
const primaryLeagueUrls = [pragueAutumn2026LeagueUrl]
const pragueLeagueNamePatterns = ["%praha%", "%prahy%", "%praze%", "%praž%"]
const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000
const latestQuizResultsUpdateCacheSeconds = 60
const leagueStandingsCacheSeconds = 24 * 60 * 60

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
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 5000,
    max: 2,
    maxLifetimeSeconds: 60,
    query_timeout: 4000,
    statement_timeout: 4000
  })
  return pool
}

const resetPool = async () => {
  const poolToReset = pool
  pool = null

  if (!poolToReset) {
    return
  }

  try {
    await poolToReset.end()
  } catch (error) {
    console.error(error)
  }
}

const isRetriableDatabaseError = (error: unknown) => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : ""
  const message = error instanceof Error ? error.message.toLowerCase() : ""

  return (
    code === "57014" ||
    code.startsWith("08") ||
    message.includes("timeout") ||
    message.includes("connection terminated") ||
    message.includes("connection ended") ||
    message.includes("socket closed")
  )
}

const queryDatabase = async <Row extends QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<Row>> => {
  try {
    return await getPool().query<Row>(text, values)
  } catch (error) {
    if (!isRetriableDatabaseError(error)) {
      throw error
    }

    await resetPool()
    return getPool().query<Row>(text, values)
  }
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

export const getTeamKey = (teamId: number | null, teamName: string) => {
  return teamId === null ? `name:${teamName}` : `id:${teamId}:name:${teamName}`
}

const loadTeamSummaries = async (): Promise<TeamSummary[]> => {
  const result = await queryDatabase<{
    team_id: number | null
    team_name: string
    team_pub: string | null
    quiz_count: number
    first_date: Date
    last_date: Date
    average_points: string
    best_points: number
    best_place: number
    duplicate_name_count: number
  }>(`
    with combined as (
      select
        team_id,
        team_name,
        pub,
        points,
        order_in_quiz,
        quiz_date,
        id as id_num
      from public.quiz_results
      union all
      select
        team_id,
        team_name,
        pub,
        points,
        order_in_quiz,
        quiz_date,
        id as id_num
      from public.quiz_manual_results
      where status <> 'rejected'
    ),
    team_summaries as (
      select
        team_id,
        team_name,
        (array_agg(
          nullif(trim(regexp_replace(trim(pub), '[[:space:]]+(PO|ÚT|ST|ČT|PÁ|SO|NE)$', '')), '')
          order by quiz_date desc, id_num desc
        ))[1] as team_pub,
        count(*)::int as quiz_count,
        min(quiz_date) as first_date,
        max(quiz_date) as last_date,
        round(avg(points)::numeric, 2) as average_points,
        max(points) as best_points,
        min(order_in_quiz) as best_place
      from combined
      group by team_id, team_name
    )
    select
      team_id,
      team_name,
      team_pub,
      quiz_count,
      first_date,
      last_date,
      average_points,
      best_points,
      best_place,
      count(*) over (partition by team_name)::int as duplicate_name_count
    from team_summaries
    order by team_name, team_id nulls last
  `)

  return result.rows.map((row) => ({
    teamId: row.team_id,
    teamKey: getTeamKey(row.team_id, row.team_name),
    teamName: row.team_name,
    teamPub: row.team_pub,
    quizCount: row.quiz_count,
    firstDate: row.first_date.toISOString(),
    lastDate: row.last_date.toISOString(),
    averagePoints: Number(row.average_points),
    bestPoints: Number(row.best_points),
    bestPlace: row.best_place,
    duplicateNameCount: row.duplicate_name_count
  }))
}

export type CombinedQuizResultRow = {
  id: string
  source: "scraped" | "manual"
  team_id: number | null
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
}

// Kept pure and exported so the id-prefixing/tagging logic (which must never
// let a scraped row and a manual row collide on React key / identity, even
// when their underlying numeric ids match) is unit-testable without a
// database. See src/lib/quiz-results.test.ts.
export const mapCombinedQuizResultRow = (row: CombinedQuizResultRow): QuizResult => ({
  id: `${row.source === "scraped" ? "s" : "m"}${row.id}`,
  source: row.source,
  teamId: row.team_id,
  teamName: row.team_name,
  orderInQuiz: row.order_in_quiz,
  points: row.points === null ? null : Number(row.points),
  quizDate: row.quiz_date.toISOString(),
  pub: row.pub,
  pubUrl: row.pub_url ?? "#",
  quizDetailsUrl: row.source === "scraped" ? getQuizDetailsUrl(row.quiz_details_id) : null,
  tip56Question: row.tip_56_question,
  doplnovacek: row.doplnovacek,
  clenu: row.clenu,
  maxBodyVKole: row.max_body_v_kole === null ? null : Number(row.max_body_v_kole),
  specialName: row.league_name
})

const loadTeamResults = async (teamId: number | null, teamName: string): Promise<QuizResult[]> => {
  const result = await queryDatabase<CombinedQuizResultRow>(
    `
      with combined as (
        select
          id::text as id,
          'scraped'::text as source,
          team_id,
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
        where (
          $1::integer is not null
          and team_id = $1::integer
        ) or (
          $1::integer is null
          and team_id is null
          and team_name = $2
        )
        union all
        select
          id::text as id,
          'manual'::text as source,
          team_id,
          team_name,
          order_in_quiz,
          points,
          quiz_date,
          pub,
          null::text as pub_url,
          null::text as quiz_details_id,
          tip_56_question,
          doplnovacek,
          clenu,
          max_body_v_kole,
          nullif(trim(league_name), '') as league_name
        from public.quiz_manual_results
        where status <> 'rejected'
          and (
            ($1::integer is not null and team_id = $1::integer)
            or ($1::integer is null and team_id is null and team_name = $2)
          )
      )
      select * from combined
      order by quiz_date desc, id::bigint desc
    `,
    [teamId, teamName]
  )

  return result.rows.map(mapCombinedQuizResultRow)
}

const loadLatestQuizResultsUpdate = async () => {
  const result = await queryDatabase<{ last_result_date: Date | null }>(
    `select max(updated_at) as last_result_date from public.quiz_results`
  )

  return result.rows[0]?.last_result_date
    ? result.rows[0].last_result_date.toISOString()
    : null
}

// A handful of historical `quiz_results.pub` values are actually event/league
// names, not real venues (e.g. finals events recorded under "Finále Praha"
// instead of the venue that hosted them). Excluded so they don't pollute the
// "Hospoda" autocomplete on the manual-results admin form.
const NON_PUB_NAMES = [
  "Finále Praha",
  "Kvízový pohár FINÁLE",
  "Praha a Střední Čechy finále podzim 2019",
  "Univerzitní kvíz PRAHA Finále",
]

const loadKnownPubNames = async (): Promise<string[]> => {
  const result = await queryDatabase<{ pub_name: string }>(
    `
    select distinct pub_name from (
      select nullif(trim(regexp_replace(trim(pub), '[[:space:]]+(PO|ÚT|ST|ČT|PÁ|SO|NE)$', '')), '') as pub_name
      from public.quiz_results
      union
      select nullif(trim(pub_name), '') from public.quiz_pub_reservations
    ) names
    where pub_name is not null
      and pub_name <> all($1::text[])
    order by pub_name
    limit 500
  `,
    [NON_PUB_NAMES]
  )

  return result.rows.map((row) => row.pub_name)
}

export type KnownTeam = {
  teamId: number
  name: string
}

// Distinct (team_id, name) pairs from the scraper-owned teams registry, so
// the manual-results admin form can offer a real select instead of free
// text — a name can recur under different ids and an id under different
// names over time, so both fields identify a choice together.
const loadKnownTeams = async (): Promise<KnownTeam[]> => {
  const result = await queryDatabase<{ team_id: number; name: string }>(`
    select distinct team_id, name
    from public.teams
    order by name, team_id
  `)

  return result.rows.map((row) => ({ teamId: row.team_id, name: row.name }))
}

const parseLeagueId = (leagueId: string | undefined) => {
  if (!leagueId) {
    return null
  }

  const parsed = Number(leagueId)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const mapLeagueSummaryRow = (row: {
  id: number
  league_name: string
  period_start: Date
  period_stop: Date
  league_url: string | null
}): LeagueSummary => ({
  leagueId: row.id,
  leagueName: row.league_name,
  periodStart: row.period_start.toISOString(),
  periodStop: row.period_stop.toISOString(),
  leagueUrl: row.league_url
})

const loadPrahaLeagueSummaries = async (): Promise<LeagueSummary[]> => {
  const result = await queryDatabase<{
    id: number
    league_name: string
    period_start: Date
    period_stop: Date
    league_url: string | null
  }>(
    `
      select
        id::int,
        league_name,
        period_start,
        period_stop,
        league_url
      from public.quiz_leagues
      where (
          league_url = any($1::text[])
          or (
            (league_url is null or not (league_url = any($2::text[])))
            and not (league_name = any($3::text[]))
            and exists (
              select 1
              from unnest($4::text[]) as pattern
              where lower(league_name) like pattern
            )
          )
        )
      order by
        case
          when league_url = $5 then 0
          else 2
        end,
        period_stop desc,
        period_start desc,
        id desc
    `,
    [
      primaryLeagueUrls,
      ignoredLeagueUrls,
      ignoredLeagueNames,
      pragueLeagueNamePatterns,
      pragueAutumn2026LeagueUrl
    ]
  )

  return result.rows.map(mapLeagueSummaryRow)
}

const mapLeagueStandingRows = (
  rows: {
    team_id: number | null
    team_name: string
    team_pub: string | null
    duplicate_name_count: number
    league_results: LeagueResultPoints[]
  }[]
) =>
  rows.map((row) => ({
    teamId: row.team_id,
    teamKey: getTeamKey(row.team_id, row.team_name),
    teamName: row.team_name,
    teamPub: row.team_pub,
    duplicateNameCount: row.duplicate_name_count,
    leagueResults: row.league_results.map((result) => ({
      round: Number(result.round),
      points: Number(result.points),
      date: new Date(result.date).toISOString()
    }))
  }))

const getPlayedRounds = (teams: LeagueStandingTeam[]) =>
  Math.max(0, ...teams.flatMap((team) => team.leagueResults.map((result) => result.round)))

const getTotalRegularLeagueRounds = (league: LeagueRow) =>
  Math.floor((league.period_stop.getTime() - league.period_start.getTime()) / millisecondsPerWeek) +
  1

const loadRegularLeagueStandingRows = async (league: LeagueRow) => {
  const result = await queryDatabase<{
    team_id: number | null
    team_name: string
    team_pub: string | null
    duplicate_name_count: number
    league_results: LeagueResultPoints[]
  }>(
    `
      with results_in_league as (
        select
          null::integer as team_id,
          team_name,
          nullif(trim(regexp_replace(trim(pub), '[[:space:]]+(PO|ÚT|ST|ČT|PÁ|SO|NE)$', '')), '') as team_pub,
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
          team_id,
          team_name,
          team_pub,
          league_points,
          quiz_date,
          id,
          league_week + 1 as league_round
        from results_in_league
        order by team_name, league_week, quiz_date desc, id desc
      ),
      team_totals as (
        select
          null::integer as team_id,
          team_name,
          (array_agg(team_pub order by quiz_date desc, id desc))[1] as team_pub,
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
        team_totals.team_id,
        team_totals.team_name,
        team_totals.team_pub,
        count(*) over (partition by team_totals.team_name)::int as duplicate_name_count,
        team_totals.league_results
      from team_totals
      order by team_name, team_id nulls last
    `,
    [league.period_start, league.period_stop]
  )

  return result.rows
}

const loadLeagueStandingRows = async (league: LeagueRow) => {
  return loadRegularLeagueStandingRows(league)
}

const loadLeagueTotalPubs = async (league: LeagueRow) => {
  const result = await queryDatabase<{ total_pubs: number }>(
    `
      select count(distinct nullif(trim(regexp_replace(trim(pub), '\s+(PO|ÚT|ST|ČT|PÁ|SO|NE)$', '')), ''))::int as total_pubs
      from public.quiz_results
      where quiz_date between $1 and $2
        and nullif(trim(league_name), '') is null
    `,
    [league.period_start, league.period_stop]
  )

  return result.rows[0]?.total_pubs ?? 0
}

const loadLongTermLeagueStandings = async (
  lastResultDate: string | null,
  leagueId: string | undefined
): Promise<LeagueStandings | null> => {
  const selectedLeagueId = parseLeagueId(leagueId)
  const leagueQuery =
    selectedLeagueId === null
      ? {
          text: `
            select
              id::int,
              league_name,
              period_start,
              period_stop,
              league_url
            from public.quiz_leagues
            where (
                league_url = any($1::text[])
                or (
                  (league_url is null or not (league_url = any($2::text[])))
                  and not (league_name = any($3::text[]))
                  and exists (
                    select 1
                    from unnest($4::text[]) as pattern
                    where lower(league_name) like pattern
                  )
                )
              )
            order by
              case
                when league_url = $5 then 0
                else 2
              end,
              period_stop desc,
              period_start desc,
              id desc
            limit 1
          `,
          values: [
            primaryLeagueUrls,
            ignoredLeagueUrls,
            ignoredLeagueNames,
            pragueLeagueNamePatterns,
            pragueAutumn2026LeagueUrl
          ]
        }
      : {
          text: `
            select
              id::int,
              league_name,
              period_start,
              period_stop,
              league_url
            from public.quiz_leagues
            where id = $1::int
            order by period_stop desc, period_start desc, id desc
            limit 1
          `,
          values: [selectedLeagueId]
        }
  const leagueResult = await queryDatabase<{
    id: number
    league_name: string
    period_start: Date
    period_stop: Date
    league_url: string | null
  }>(leagueQuery.text, leagueQuery.values)

  const league = leagueResult.rows[0]

  if (!league) {
    return null
  }

  const teams = mapLeagueStandingRows(await loadLeagueStandingRows(league))
  const totalPubs = await loadLeagueTotalPubs(league)

  return {
    leagueId: league.id,
    leagueName: league.league_name,
    periodStart: league.period_start.toISOString(),
    periodStop: league.period_stop.toISOString(),
    totalRounds: getTotalRegularLeagueRounds(league),
    playedRounds: getPlayedRounds(teams),
    totalPubs,
    leagueUrl: league.league_url,
    lastResultDate,
    teams
  }
}

const loadSpecialLeagueSummaries = async (): Promise<LeagueSummary[]> => {
  const result = await queryDatabase<{
    id: number
    league_name: string
    period_start: Date
    period_stop: Date
    league_url: string | null
  }>(
    `
      select
        id::int,
        league_name,
        period_start,
        period_stop,
        league_url
      from public.quiz_leagues
      where league_url = any($1::text[]) or league_name = any($2::text[])
      order by period_stop desc, period_start desc, id desc
    `,
    [specialLeagueUrls, specialLeagueNames]
  )

  return result.rows.map(mapLeagueSummaryRow)
}

const loadSpecialLeagueStandingRows = async (league: LeagueRow) => {
  const result = await queryDatabase<{
    team_id: number | null
    team_name: string
    team_pub: string | null
    duplicate_name_count: number
    league_results: LeagueResultPoints[]
  }>(
    `
      with results_in_league as (
        select
          null::integer as team_id,
          team_name,
          nullif(trim(regexp_replace(trim(pub), '[[:space:]]+(PO|ÚT|ST|ČT|PÁ|SO|NE)$', '')), '') as team_pub,
          coalesce(points, 0)::float8 as league_points,
          quiz_date,
          id,
          dense_rank() over (partition by team_name order by quiz_date, id) as league_round
        from public.quiz_results
        where trim(league_name) = $1
      ),
      team_totals as (
        select
          null::integer as team_id,
          team_name,
          (array_agg(team_pub order by quiz_date desc, id desc))[1] as team_pub,
          coalesce(
            json_agg(
              json_build_object('round', league_round, 'points', league_points, 'date', quiz_date)
              order by league_round, quiz_date, id
            ),
            '[]'::json
          ) as league_results
        from results_in_league
        group by team_name
      )
      select
        team_totals.team_id,
        team_totals.team_name,
        team_totals.team_pub,
        count(*) over (partition by team_totals.team_name)::int as duplicate_name_count,
        team_totals.league_results
      from team_totals
      order by team_name, team_id nulls last
    `,
    [league.league_name.trim()]
  )

  return result.rows
}

const loadSpecialLeagueTotalPubs = async (league: LeagueRow) => {
  const result = await queryDatabase<{ total_pubs: number }>(
    `
      select count(distinct nullif(trim(regexp_replace(trim(pub), '\s+(PO|ÚT|ST|ČT|PÁ|SO|NE)$', '')), ''))::int as total_pubs
      from public.quiz_results
      where trim(league_name) = $1
    `,
    [league.league_name.trim()]
  )

  return result.rows[0]?.total_pubs ?? 0
}

const loadSpecialLeagueStandings = async (
  lastResultDate: string | null,
  leagueId: string | undefined
): Promise<LeagueStandings | null> => {
  const selectedLeagueId = parseLeagueId(leagueId)
  const leagueQuery =
    selectedLeagueId === null
      ? {
          text: `
            select
              id::int,
              league_name,
              period_start,
              period_stop,
              league_url
            from public.quiz_leagues
            where league_url = any($1::text[]) or league_name = any($2::text[])
            order by period_stop desc, period_start desc, id desc
            limit 1
          `,
          values: [specialLeagueUrls, specialLeagueNames]
        }
      : {
          text: `
            select
              id::int,
              league_name,
              period_start,
              period_stop,
              league_url
            from public.quiz_leagues
            where id = $1::int
              and (league_url = any($2::text[]) or league_name = any($3::text[]))
            limit 1
          `,
          values: [selectedLeagueId, specialLeagueUrls, specialLeagueNames]
        }
  const leagueResult = await queryDatabase<{
    id: number
    league_name: string
    period_start: Date
    period_stop: Date
    league_url: string | null
  }>(leagueQuery.text, leagueQuery.values)

  const league = leagueResult.rows[0]

  if (!league) {
    return null
  }

  const teams = mapLeagueStandingRows(await loadSpecialLeagueStandingRows(league))
  const totalPubs = await loadSpecialLeagueTotalPubs(league)
  const playedRounds = getPlayedRounds(teams)

  return {
    leagueId: league.id,
    leagueName: league.league_name,
    periodStart: league.period_start.toISOString(),
    periodStop: league.period_stop.toISOString(),
    totalRounds: playedRounds,
    playedRounds,
    totalPubs,
    leagueUrl: league.league_url,
    lastResultDate,
    teams
  }
}

const getCachedSpecialLeagueStandings = unstable_cache(
  async (lastResultDate: string | null, leagueId: string | undefined) =>
    loadSpecialLeagueStandings(lastResultDate, leagueId),
  ["quiz-results", "special-league-standings-by-update-and-league-v1"],
  {
    revalidate: leagueStandingsCacheSeconds,
    tags: ["quiz-results"]
  }
)

const getCachedLongTermLeagueStandings = unstable_cache(
  async (lastResultDate: string | null, leagueId: string | undefined) =>
    loadLongTermLeagueStandings(lastResultDate, leagueId),
  ["quiz-results", "long-term-league-standings-by-update-and-league-v7"],
  {
    revalidate: leagueStandingsCacheSeconds,
    tags: ["quiz-results"]
  }
)

const getCachedLatestQuizResultsUpdate = unstable_cache(
  loadLatestQuizResultsUpdate,
  ["quiz-results", "latest-update"],
  {
    revalidate: latestQuizResultsUpdateCacheSeconds,
    tags: ["quiz-results"]
  }
)

const getCachedKnownPubNames = unstable_cache(
  loadKnownPubNames,
  ["quiz-results", "known-pub-names"],
  {
    revalidate: 3600,
    tags: ["quiz-results", "quiz-pub-reservations"]
  }
)

const getCachedKnownTeams = unstable_cache(
  loadKnownTeams,
  ["quiz-results", "known-teams"],
  {
    revalidate: 3600,
    tags: ["quiz-results", "teams"]
  }
)

export const getTeamSummaries = async () => {
  return loadTeamSummaries()
}

export const getTeamResults = async (teamId: number | null, teamName: string) => {
  return loadTeamResults(teamId, teamName)
}

export const getPrahaLeagueSummaries = async () => {
  return loadPrahaLeagueSummaries()
}

export const getLongTermLeagueStandings = async (leagueId?: string) => {
  const lastResultDate = await getCachedLatestQuizResultsUpdate()

  return getCachedLongTermLeagueStandings(lastResultDate, leagueId)
}

export const getSpecialLeagueSummaries = async () => {
  return loadSpecialLeagueSummaries()
}

export const getSpecialLeagueStandings = async (leagueId?: string) => {
  const lastResultDate = await getCachedLatestQuizResultsUpdate()

  return getCachedSpecialLeagueStandings(lastResultDate, leagueId)
}

export const getKnownPubNames = async () => {
  return getCachedKnownPubNames()
}

export const getKnownTeams = async () => {
  return getCachedKnownTeams()
}
