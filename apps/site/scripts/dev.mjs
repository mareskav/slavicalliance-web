import { createHmac, timingSafeEqual } from "node:crypto"
import { createServer } from "node:http"
import { connect } from "node:net"
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Pool } from "pg"

const host = "localhost"
const publicPort = Number(process.env.PORT || 3000)
const nextPort = Number(process.env.NEXT_PORT || (publicPort === 3000 ? 3002 : publicPort + 1))
const siteRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = join(siteRoot, "../..")
const sessionCookieName = "sa_admin_session"
const sessionMaxAgeSeconds = 60 * 60 * 8
const validRoles = ["admin", "captain"]

// Mirrors NON_PUB_NAMES in apps/results/src/lib/quiz-results.ts — a handful
// of historical quiz_results.pub values are actually event/league names, not
// real venues, and would otherwise pollute the "Hospoda" autocomplete.
const NON_PUB_NAMES = [
  "Finále Praha",
  "Kvízový pohár FINÁLE",
  "Praha a Střední Čechy finále podzim 2019",
  "Univerzitní kvíz PRAHA Finále",
]

const npmExecPath = process.env.npm_execpath
const npmCommand = npmExecPath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm"
const npmArgs = (args) => (npmExecPath ? [npmExecPath, ...args] : args)
const nextProxyRetryDelaysMs = [150, 350]

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return {}
  }

  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=")
        const key = line.slice(0, separator).trim()
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^"(.*)"$/, "$1")
          .replace(/^'(.*)'$/, "$1")

        return [key, value]
      })
  )
}

const localEnv = {
  ...parseEnvFile(join(repoRoot, ".env.local")),
  ...parseEnvFile(join(siteRoot, ".env.local")),
  ...process.env,
}

for (const [key, value] of Object.entries(localEnv)) {
  if (value && process.env[key] === undefined) {
    process.env[key] = value
  }
}

const json = (response, payload, init = {}) => {
  const body = JSON.stringify(payload)

  response.writeHead(init.status || 200, {
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json; charset=utf-8",
    ...init.headers,
  })
  response.end(body)
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isNextProxyConnectionError = (error) => {
  if (!(error instanceof Error)) {
    return false
  }

  if (error.message === "fetch failed") {
    return true
  }

  const causeCode = error.cause && typeof error.cause === "object" ? error.cause.code : undefined
  return causeCode === "ECONNREFUSED" || causeCode === "ECONNRESET" || causeCode === "EPIPE"
}

const toNextUnavailableError = (error) => {
  const unavailableError = new Error(
    `Next dev server on http://${host}:${nextPort} is starting or restarting. Retry in a moment.`,
    { cause: error }
  )
  unavailableError.name = "NextDevServerUnavailableError"
  return unavailableError
}

const readRequestBody = async (request) => {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

const readJsonBody = async (request) => {
  const body = await readRequestBody(request)
  return body.length ? JSON.parse(body.toString("utf8")) : {}
}

const parseCookies = (request) => {
  const cookies = new Map()

  for (const part of String(request.headers.cookie || "").split(";")) {
    const [name, ...value] = part.trim().split("=")

    if (name) {
      cookies.set(name, value.join("="))
    }
  }

  return cookies
}

const requiredEnv = (key) => {
  const value = localEnv[key]

  if (!value) {
    throw new Error(`Missing ${key} in .env.local`)
  }

  return value
}

const sign = (value) =>
  createHmac("sha256", requiredEnv("SESSION_SECRET")).update(value).digest("base64url")

const createSessionCookie = (role) => {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds
  const payload = Buffer.from(JSON.stringify({ role, exp: expiresAt })).toString("base64url")
  const signature = sign(payload)

  return `${sessionCookieName}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}`
}

const clearSessionCookie = `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`

// Mirrors apps/site/functions/_lib/admin.js's getSession: fails closed on a
// tampered signature, an expired session, or a legacy/missing role claim.
const getLocalSession = (request) => {
  const token = parseCookies(request).get(sessionCookieName)

  if (!token) {
    return null
  }

  const [payload, signature] = token.split(".")

  if (!payload || !signature) {
    return null
  }

  const expected = sign(payload)
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null
  }

  const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))

  if (!validRoles.includes(session.role)) {
    return null
  }

  if (typeof session.exp !== "number" || session.exp <= Math.floor(Date.now() / 1000)) {
    return null
  }

  return session
}

const parseMarkdown = (raw) => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const data = {}
  let content = raw

  if (match) {
    content = raw.slice(match[0].length)
    for (const line of match[1].split(/\r?\n/)) {
      const separator = line.indexOf(":")
      if (separator === -1) continue

      const key = line.slice(0, separator).trim()
      const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "")
      if (key) data[key] = value
    }
  }

  return { data, content }
}

const slugPath = (slug) => {
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return null
  }

  return join(siteRoot, "contents/pages", `${slug}.md`)
}

const pageFromMarkdown = (slug, raw) => {
  const { data, content } = parseMarkdown(raw)
  const normalisedContent =
    slug === "landing" ? content.replace(/\n##[\s\S]*$/, "").trim() : content

  return {
    slug,
    title: String(data.title || "Slavic Alliance"),
    content: normalisedContent,
    raw,
  }
}

let quizPool = null

const getQuizPool = () => {
  const connectionString = localEnv.DATABASE_URL?.trim()
  if (!connectionString) return null
  quizPool ??= new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    query_timeout: 10000,
    statement_timeout: 10000,
    max: 5,
  })
  return quizPool
}

// Separate pool on DATABASE_URL_RW (the sa_web_rw role), matching
// apps/results/src/lib/manual-results-db.ts's split from the read-only
// quiz pool above — kept apart even in local dev so a bug here can't reach
// the scraper-owned tables through the wrong connection.
let manualResultsPool = null

const getManualResultsPool = () => {
  const connectionString = localEnv.DATABASE_URL_RW?.trim()
  if (!connectionString) return null
  manualResultsPool ??= new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    query_timeout: 10000,
    statement_timeout: 10000,
    max: 5,
  })
  return manualResultsPool
}

const manualResultColumns = `
  id::text,
  team_id,
  team_name,
  quiz_date,
  points,
  doplnovacek,
  pub,
  note,
  status,
  submitted_by,
  submitted_at,
  updated_at
`

const mapManualResultRow = (row) => ({
  id: row.id,
  teamId: row.team_id,
  teamName: row.team_name,
  quizDate: row.quiz_date.toISOString(),
  points: row.points === null ? null : Number(row.points),
  doplnovacek: row.doplnovacek === null ? null : Number(row.doplnovacek),
  pub: row.pub,
  note: row.note,
  status: row.status,
  submittedBy: row.submitted_by,
  submittedAt: row.submitted_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
})

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

const isFiniteNonNegativeNumber = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0

// Mirrors apps/results/src/app/api/admin/manual-results/route.ts: points are
// scored in half-point increments, doplňovačky in whole points.
const isHalfPointNumber = (value) => Math.abs(value * 2 - Math.round(value * 2)) < 1e-9

const validateManualResultInput = (body) => {
  const teamName = typeof body.teamName === "string" ? body.teamName.trim() : ""

  if (!teamName) {
    return { ok: false, error: "Team name is required." }
  }

  let teamId = null
  if (body.teamId !== undefined && body.teamId !== null && body.teamId !== "") {
    const parsed = Number(body.teamId)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, error: "Team id must be a positive integer." }
    }
    teamId = parsed
  }

  if (typeof body.quizDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.quizDate)) {
    return { ok: false, error: "Quiz date must be a YYYY-MM-DD date." }
  }

  if (body.quizDate > todayIsoDate()) {
    return { ok: false, error: "Quiz date cannot be in the future." }
  }

  let points = null
  if (body.points !== undefined && body.points !== null && body.points !== "") {
    const parsed = Number(body.points)
    if (!isFiniteNonNegativeNumber(parsed) || !isHalfPointNumber(parsed)) {
      return { ok: false, error: "Points must be a non-negative number in half-point increments." }
    }
    points = parsed
  }

  let doplnovacek = null
  if (body.doplnovacek !== undefined && body.doplnovacek !== null && body.doplnovacek !== "") {
    const parsed = Number(body.doplnovacek)
    if (!isFiniteNonNegativeNumber(parsed) || !Number.isInteger(parsed)) {
      return { ok: false, error: "Doplňovačky must be a non-negative whole number." }
    }
    doplnovacek = parsed
  }

  const pub = typeof body.pub === "string" && body.pub.trim() ? body.pub.trim() : null
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null

  return { ok: true, value: { teamId, teamName, quizDate: body.quizDate, points, doplnovacek, pub, note } }
}

const isUniqueViolation = (error) => error && typeof error === "object" && error.code === "23505"

const handleLocalApi = async (request, response, pathname) => {
  if (request.method === "GET" && pathname === "/vysledky/api/quiz-reservations") {
    const pool = getQuizPool()
    if (!pool) {
      json(response, { error: "DATABASE_URL is not configured." }, { status: 503 })
      return true
    }
    try {
      const [reservationsResult, topTeamsResult] = await Promise.all([
        pool.query(`
          select
            id::text, city, pub_name, pub_url, reservation_url,
            quiz_date::text, quiz_time::text, team_name,
            members_count, registered_teams_count,
            free_tables_count, total_tables_count, scraped_at
          from public.quiz_pub_reservations
          where quiz_date >= current_date
          order by quiz_date, coalesce(quiz_time, '23:59'::time), city, pub_name, team_name, id
          limit 800
        `),
        pool.query(
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
                qr.quiz_date, qr.id,
                floor((qr.quiz_date - l.period_start::date)::numeric / 7)::int as league_week
              from public.quiz_results qr
              cross join league l
              where qr.quiz_date between l.period_start and l.period_stop
                and nullif(trim(qr.league_name), '') is null
            ),
            picked_results as (
              select distinct on (team_name, league_week)
                team_name, league_points, quiz_date, id
              from results_in_league
              order by team_name, league_week, quiz_date desc, id desc
            ),
            team_totals as (
              select team_name, sum(league_points)::float8 as total_points
              from picked_results
              group by team_name
            ),
            top_teams as (
              select team_name, total_points,
                row_number() over (order by total_points desc, team_name) as placement
              from team_totals
              order by total_points desc, team_name
              limit $2
            ),
            next_reservation as (
              select distinct on (r.team_name)
                r.team_name, r.quiz_date::text, r.quiz_time::text,
                r.city, r.pub_name, r.pub_url, r.reservation_url
              from public.quiz_pub_reservations r
              where r.quiz_date >= current_date
                and r.team_name in (select team_name from top_teams)
              order by r.team_name, r.quiz_date, coalesce(r.quiz_time, '23:59'::time), r.id
            )
            select
              t.placement::int, t.team_name,
              t.total_points::text,
              n.quiz_date, n.quiz_time, n.city, n.pub_name, n.pub_url, n.reservation_url
            from top_teams t
            left join next_reservation n on n.team_name = t.team_name
            order by t.placement, t.team_name
          `,
          ["Finále Praha", 10]
        ),
      ])
      const reservations = reservationsResult.rows.map((row) => ({
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
        scrapedAt: row.scraped_at.toISOString(),
      }))
      const topTeams = topTeamsResult.rows.map((row) => ({
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
                reservationUrl: row.reservation_url,
              }
            : null,
      }))
      json(response, { reservations, topTeams })
    } catch (error) {
      console.error("quiz-reservations error:", error)
      json(response, { error: "Failed to load quiz reservations." }, { status: 500 })
    }
    return true
  }

  if (request.method === "GET" && pathname === "/vysledky/api/admin/pub-names") {
    const session = getLocalSession(request)

    if (!session) {
      json(response, { error: "Unauthorized" }, { status: 401 })
      return true
    }

    const pool = getQuizPool()
    if (!pool) {
      json(response, { error: "DATABASE_URL is not configured." }, { status: 503 })
      return true
    }

    try {
      const result = await pool.query(
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
      json(response, { pubNames: result.rows.map((row) => row.pub_name) })
    } catch (error) {
      console.error("pub-names GET error:", error)
      json(response, { error: "Failed to load pub names." }, { status: 500 })
    }
    return true
  }

  if (request.method === "GET" && pathname === "/vysledky/api/admin/teams") {
    const session = getLocalSession(request)

    if (!session) {
      json(response, { error: "Unauthorized" }, { status: 401 })
      return true
    }

    const pool = getQuizPool()
    if (!pool) {
      json(response, { error: "DATABASE_URL is not configured." }, { status: 503 })
      return true
    }

    try {
      const result = await pool.query(`
        select distinct team_id, name
        from public.teams
        order by name, team_id
      `)
      json(response, { teams: result.rows.map((row) => ({ teamId: row.team_id, name: row.name })) })
    } catch (error) {
      console.error("teams GET error:", error)
      json(response, { error: "Failed to load teams." }, { status: 500 })
    }
    return true
  }

  if (pathname === "/vysledky/api/admin/manual-results") {
    const session = getLocalSession(request)

    if (!session) {
      json(response, { error: "Unauthorized" }, { status: 401 })
      return true
    }

    const pool = getManualResultsPool()
    if (!pool) {
      json(response, { error: "DATABASE_URL_RW is not configured." }, { status: 503 })
      return true
    }

    if (request.method === "GET") {
      try {
        const result = await pool.query(
          `select ${manualResultColumns} from public.quiz_manual_results order by submitted_at desc, id desc`
        )
        json(response, { results: result.rows.map(mapManualResultRow) })
      } catch (error) {
        console.error("manual-results GET error:", error)
        json(response, { error: "Failed to load manual results." }, { status: 500 })
      }
      return true
    }

    if (request.method === "POST") {
      const body = await readJsonBody(request)
      const validation = validateManualResultInput(body)

      if (!validation.ok) {
        json(response, { error: validation.error }, { status: 400 })
        return true
      }

      try {
        const { teamId, teamName, quizDate, points, doplnovacek, pub, note } = validation.value
        const result = await pool.query(
          `
            insert into public.quiz_manual_results
              (team_id, team_name, quiz_date, points, doplnovacek, pub, note, submitted_by)
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            returning ${manualResultColumns}
          `,
          [teamId, teamName, quizDate, points, doplnovacek, pub, note, session.role]
        )
        json(response, { result: mapManualResultRow(result.rows[0]) }, { status: 201 })
      } catch (error) {
        if (isUniqueViolation(error)) {
          json(response, { error: "A result for this team, date and pub already exists." }, { status: 409 })
          return true
        }
        console.error("manual-results POST error:", error)
        json(response, { error: "Failed to save manual result." }, { status: 500 })
      }
      return true
    }

    if (request.method === "PATCH") {
      const body = await readJsonBody(request)

      if (typeof body.id !== "string" || !body.id) {
        json(response, { error: "Missing id." }, { status: 400 })
        return true
      }

      try {
        if (body.action === "reject") {
          const result = await pool.query(
            `
              update public.quiz_manual_results
              set status = 'rejected', updated_at = now()
              where id = $1::bigint
              returning ${manualResultColumns}
            `,
            [body.id]
          )

          if (!result.rows[0]) {
            json(response, { error: "Not found." }, { status: 404 })
            return true
          }

          json(response, { result: mapManualResultRow(result.rows[0]) })
          return true
        }

        // Only validate fields the caller actually sent; a PATCH edit may touch
        // a subset of columns, mirroring apps/results/src/app/api/admin/manual-results/route.ts.
        if (body.teamName !== undefined || body.quizDate !== undefined) {
          const validation = validateManualResultInput({
            teamName: body.teamName ?? "placeholder",
            quizDate: body.quizDate ?? todayIsoDate(),
            teamId: body.teamId,
            points: body.points,
            doplnovacek: body.doplnovacek,
            pub: body.pub,
            note: body.note,
          })

          if (!validation.ok) {
            json(response, { error: validation.error }, { status: 400 })
            return true
          }
        }

        const result = await pool.query(
          `
            update public.quiz_manual_results
            set
              team_id = coalesce($2, team_id),
              team_name = coalesce($3, team_name),
              quiz_date = coalesce($4, quiz_date),
              points = coalesce($5, points),
              doplnovacek = coalesce($6, doplnovacek),
              pub = coalesce($7, pub),
              note = coalesce($8, note),
              updated_at = now()
            where id = $1::bigint and status <> 'rejected'
            returning ${manualResultColumns}
          `,
          [
            body.id,
            body.teamId === undefined ? null : body.teamId === null || body.teamId === "" ? null : Number(body.teamId),
            typeof body.teamName === "string" ? body.teamName.trim() : null,
            typeof body.quizDate === "string" ? body.quizDate : null,
            body.points === undefined ? null : body.points === null || body.points === "" ? null : Number(body.points),
            body.doplnovacek === undefined
              ? null
              : body.doplnovacek === null || body.doplnovacek === ""
                ? null
                : Number(body.doplnovacek),
            typeof body.pub === "string" ? body.pub.trim() : null,
            typeof body.note === "string" ? body.note.trim() : null,
          ]
        )

        if (!result.rows[0]) {
          json(response, { error: "Not found." }, { status: 404 })
          return true
        }

        json(response, { result: mapManualResultRow(result.rows[0]) })
      } catch (error) {
        console.error("manual-results PATCH error:", error)
        json(response, { error: "Failed to update manual result." }, { status: 500 })
      }
      return true
    }

    json(response, { error: "Method not allowed." }, { status: 405 })
    return true
  }

  if (request.method === "GET" && pathname === "/api/admin/session") {
    const session = getLocalSession(request)
    json(response, { authenticated: session !== null, role: session?.role ?? null })
    return true
  }

  if (request.method === "POST" && pathname === "/api/admin/login") {
    const { password } = await readJsonBody(request)
    const adminPassword = requiredEnv("ADMIN_PASSWORD")
    const captainPassword = localEnv.CAPTAIN_PASSWORD

    let role = null
    if (password && password === adminPassword) {
      role = "admin"
    } else if (password && captainPassword && password === captainPassword) {
      role = "captain"
    }

    if (!role) {
      json(response, { error: "Invalid password" }, { status: 401 })
      return true
    }

    json(response, { authenticated: true, role }, { headers: { "Set-Cookie": createSessionCookie(role) } })
    return true
  }

  if (request.method === "POST" && pathname === "/api/admin/logout") {
    json(response, { authenticated: false }, { headers: { "Set-Cookie": clearSessionCookie } })
    return true
  }

  const contentMatch = pathname.match(/^\/api\/content\/pages\/([^/]+)$/)
  if (request.method === "GET" && contentMatch) {
    const filePath = slugPath(contentMatch[1])

    if (!filePath) {
      json(response, { error: "Invalid slug." }, { status: 400 })
      return true
    }

    const raw = await readFile(filePath, "utf8")
    json(response, pageFromMarkdown(contentMatch[1], raw))
    return true
  }

  const adminContentMatch = pathname.match(/^\/api\/admin\/content\/pages\/([^/]+)$/)
  if (request.method === "PUT" && adminContentMatch) {
    const session = getLocalSession(request)
    if (!session || session.role !== "admin") {
      json(response, { error: "Unauthorized" }, { status: 401 })
      return true
    }

    const filePath = slugPath(adminContentMatch[1])

    if (!filePath) {
      json(response, { error: "Invalid slug." }, { status: 400 })
      return true
    }

    const { raw } = await readJsonBody(request)

    if (!raw) {
      json(response, { error: "Missing raw Markdown." }, { status: 400 })
      return true
    }

    await writeFile(filePath, raw, "utf8")
    json(response, pageFromMarkdown(adminContentMatch[1], raw))
    return true
  }

  return false
}

const proxyToNext = async (request, response) => {
  const target = new URL(request.url || "/", `http://${host}:${nextPort}`)
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await readRequestBody(request)
  const headers = new Headers(request.headers)
  headers.set("host", `${host}:${nextPort}`)
  headers.set("x-forwarded-host", `${host}:${publicPort}`)
  headers.set("x-forwarded-proto", "http")

  let nextResponse
  let lastError = null

  for (let attempt = 0; attempt <= nextProxyRetryDelaysMs.length; attempt += 1) {
    try {
      nextResponse = await fetch(target, {
        body,
        headers,
        method: request.method,
        redirect: "manual",
      })
      break
    } catch (error) {
      lastError = error

      if (!isNextProxyConnectionError(error)) {
        throw error
      }

      if (attempt === nextProxyRetryDelaysMs.length) {
        throw toNextUnavailableError(error)
      }

      await wait(nextProxyRetryDelaysMs[attempt])
    }
  }

  if (!nextResponse) {
    throw toNextUnavailableError(lastError)
  }

  const responseHeaders = Object.fromEntries(nextResponse.headers)
  delete responseHeaders["content-encoding"]
  delete responseHeaders["content-length"]
  delete responseHeaders["transfer-encoding"]

  response.writeHead(nextResponse.status, responseHeaders)
  response.end(Buffer.from(await nextResponse.arrayBuffer()))
}

const proxyUpgradeToNext = (request, socket, head) => {
  const nextSocket = connect(nextPort, host, () => {
    nextSocket.write(
      `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n` +
        Object.entries({
          ...request.headers,
          host: `${host}:${nextPort}`,
          "x-forwarded-host": `${host}:${publicPort}`,
          "x-forwarded-proto": "http",
        })
          .map(([key, value]) =>
            Array.isArray(value) ? `${key}: ${value.join(", ")}` : `${key}: ${value}`
          )
          .join("\r\n") +
        "\r\n\r\n"
    )

    if (head.length) {
      nextSocket.write(head)
    }

    socket.pipe(nextSocket)
    nextSocket.pipe(socket)
  })

  nextSocket.on("error", () => socket.destroy())
  socket.on("error", () => nextSocket.destroy())
}

const terminate = (processToStop) => {
  if (processToStop.killed) {
    return
  }

  if (process.platform === "win32" && processToStop.pid) {
    spawn("taskkill.exe", ["/pid", String(processToStop.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    })
    return
  }

  processToStop.kill()
}

const next = spawn(
  npmCommand,
  npmArgs(["run", "dev:next", "--", "--hostname", host, "--port", String(nextPort)]),
  {
    stdio: "inherit",
    shell: false,
  }
)

const server = createServer(async (request, response) => {
  try {
    const { pathname } = new URL(request.url || "/", `http://${host}:${publicPort}`)

    if (await handleLocalApi(request, response, pathname)) {
      return
    }

    await proxyToNext(request, response)
  } catch (error) {
    if (error instanceof Error && error.name === "NextDevServerUnavailableError") {
      json(response, { error: error.message }, { status: 503, headers: { "Retry-After": "1" } })
      return
    }

    json(
      response,
      { error: error instanceof Error ? error.message : "Local dev server failed." },
      { status: 500 }
    )
  }
})

server.on("error", (error) => {
  terminate(next)

  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${publicPort} is already in use. Stop the existing dev server first.`)
    process.exit(1)
  }

  throw error
})

server.on("upgrade", proxyUpgradeToNext)

server.listen(publicPort, host, () => {
  console.log(`Local site dev server ready on http://${host}:${publicPort}`)
  console.log(`Next dev server proxied from http://${host}:${nextPort}`)
})

next.on("exit", (code, signal) => {
  if (signal) {
    return
  }

  server.close(() => process.exit(code ?? 1))
})

const shutdown = () => {
  server.close()
  terminate(next)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
