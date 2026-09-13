import { NextResponse } from "next/server"

import { getAdminSession } from "@/lib/admin-session"
import {
  insertManualResult,
  listManualResults,
  rejectManualResult,
  updateManualResult,
  type ManualResultInput
} from "@/lib/manual-results"

const getSiteOrigin = () => {
  const configured = process.env.NEXT_PUBLIC_SITE_APP_URL?.trim() || process.env.SITE_APP_URL?.trim()

  if (configured) {
    return configured.replace(/\/$/, "")
  }

  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://slavicalliance.cz"
}

const isOriginAllowed = (request: Request) => {
  const origin = request.headers.get("Origin")

  // No Origin header at all (e.g. same-origin navigations in some browsers,
  // or non-browser clients) is not treated as an automatic pass-through for
  // a write route — but SameSite=Lax cookies already block cross-site form
  // posts from reaching here with credentials, so this only rejects a
  // present-but-wrong Origin.
  if (!origin) {
    return true
  }

  return origin.replace(/\/$/, "") === getSiteOrigin()
}

const isFiniteNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0

// Points are scored in half-point increments; doplňovačky are whole points.
// The float comparison uses an epsilon since e.g. 0.1 + 0.2 !== 0.3 in JS.
const isHalfPointNumber = (value: number) => Math.abs(value * 2 - Math.round(value * 2)) < 1e-9

type ManualResultRequestBody = {
  teamId?: unknown
  teamName?: unknown
  quizDate?: unknown
  points?: unknown
  doplnovacek?: unknown
  pub?: unknown
  note?: unknown
}

type ValidationResult =
  | { ok: true; value: ManualResultInput }
  | { ok: false; error: string }

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

const validateManualResultInput = (body: ManualResultRequestBody): ValidationResult => {
  const teamName = typeof body.teamName === "string" ? body.teamName.trim() : ""

  if (!teamName) {
    return { ok: false, error: "Team name is required." }
  }

  let teamId: number | null = null
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

  let points: number | null = null
  if (body.points !== undefined && body.points !== null && body.points !== "") {
    const parsed = Number(body.points)
    if (!isFiniteNonNegativeNumber(parsed) || !isHalfPointNumber(parsed)) {
      return { ok: false, error: "Points must be a non-negative number in half-point increments." }
    }
    points = parsed
  }

  let doplnovacek: number | null = null
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

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505"

export const GET = async (request: Request) => {
  try {
    const session = await getAdminSession(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = await listManualResults()
    return NextResponse.json({ results })
  } catch (error) {
    console.error("manual-results GET route error:", error)
    return NextResponse.json({ error: "Failed to load manual results." }, { status: 500 })
  }
}

export const POST = async (request: Request) => {
  try {
    const session = await getAdminSession(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isOriginAllowed(request)) {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 })
    }

    const body = (await request.json()) as ManualResultRequestBody
    const validation = validateManualResultInput(body)

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const result = await insertManualResult(validation.value, session.role)
    return NextResponse.json({ result }, { status: 201 })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "A result for this team, date and pub already exists." },
        { status: 409 }
      )
    }

    console.error("manual-results POST route error:", error)
    return NextResponse.json({ error: "Failed to save manual result." }, { status: 500 })
  }
}

type ManualResultPatchBody = ManualResultRequestBody & {
  id?: unknown
  action?: unknown
}

export const PATCH = async (request: Request) => {
  try {
    const session = await getAdminSession(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isOriginAllowed(request)) {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 })
    }

    const body = (await request.json()) as ManualResultPatchBody

    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 })
    }

    if (body.action === "reject") {
      const result = await rejectManualResult(body.id)

      if (!result) {
        return NextResponse.json({ error: "Not found." }, { status: 404 })
      }

      return NextResponse.json({ result })
    }

    const partial: ManualResultRequestBody = {
      teamId: body.teamId,
      teamName: body.teamName,
      quizDate: body.quizDate,
      points: body.points,
      doplnovacek: body.doplnovacek,
      pub: body.pub,
      note: body.note
    }

    // Only validate fields the caller actually sent; a PATCH edit may touch
    // a subset of columns. teamName/quizDate are re-validated in full when
    // present since they carry required-ness rules on insert.
    if (partial.teamName !== undefined || partial.quizDate !== undefined) {
      const validation = validateManualResultInput({
        teamName: partial.teamName ?? "placeholder",
        quizDate: partial.quizDate ?? todayIsoDate(),
        teamId: partial.teamId,
        points: partial.points,
        doplnovacek: partial.doplnovacek,
        pub: partial.pub,
        note: partial.note
      })

      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
    }

    const result = await updateManualResult(body.id, {
      teamId:
        partial.teamId === undefined
          ? undefined
          : partial.teamId === null || partial.teamId === ""
            ? null
            : Number(partial.teamId),
      teamName: typeof partial.teamName === "string" ? partial.teamName.trim() : undefined,
      quizDate: typeof partial.quizDate === "string" ? partial.quizDate : undefined,
      points:
        partial.points === undefined
          ? undefined
          : partial.points === null || partial.points === ""
            ? null
            : Number(partial.points),
      doplnovacek:
        partial.doplnovacek === undefined
          ? undefined
          : partial.doplnovacek === null || partial.doplnovacek === ""
            ? null
            : Number(partial.doplnovacek),
      pub: typeof partial.pub === "string" ? partial.pub.trim() || null : undefined,
      note: typeof partial.note === "string" ? partial.note.trim() || null : undefined
    })

    if (!result) {
      return NextResponse.json({ error: "Not found." }, { status: 404 })
    }

    return NextResponse.json({ result })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "A result for this team, date and pub already exists." },
        { status: 409 }
      )
    }

    console.error("manual-results PATCH route error:", error)
    return NextResponse.json({ error: "Failed to update manual result." }, { status: 500 })
  }
}
