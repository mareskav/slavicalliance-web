import { queryManualResultsDatabase } from "@/lib/manual-results-db"

export type ManualResultStatus = "approved" | "rejected"

export type ManualResult = {
  id: string
  teamId: number | null
  teamName: string
  quizDate: string
  points: number | null
  doplnovacek: number | null
  pub: string | null
  note: string | null
  status: ManualResultStatus
  submittedBy: string
  submittedAt: string
  updatedAt: string
}

export type ManualResultInput = {
  teamId: number | null
  teamName: string
  quizDate: string
  points: number | null
  doplnovacek: number | null
  pub: string | null
  note: string | null
}

export type ManualResultRow = {
  id: string
  team_id: number | null
  team_name: string
  quiz_date: Date
  points: number | null
  doplnovacek: number | null
  pub: string | null
  note: string | null
  status: ManualResultStatus
  submitted_by: string
  submitted_at: Date
  updated_at: Date
}

// Pure and exported so it is unit-testable without a database.
export const mapManualResultRow = (row: ManualResultRow): ManualResult => ({
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
  updatedAt: row.updated_at.toISOString()
})

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

export const listManualResults = async (): Promise<ManualResult[]> => {
  const result = await queryManualResultsDatabase<ManualResultRow>(
    `select ${manualResultColumns} from public.quiz_manual_results order by submitted_at desc, id desc`
  )

  return result.rows.map(mapManualResultRow)
}

export const insertManualResult = async (
  input: ManualResultInput,
  submittedBy: string
): Promise<ManualResult> => {
  const result = await queryManualResultsDatabase<ManualResultRow>(
    `
      insert into public.quiz_manual_results
        (team_id, team_name, quiz_date, points, doplnovacek, pub, note, submitted_by)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning ${manualResultColumns}
    `,
    [
      input.teamId,
      input.teamName,
      input.quizDate,
      input.points,
      input.doplnovacek,
      input.pub,
      input.note,
      submittedBy
    ]
  )

  return mapManualResultRow(result.rows[0])
}

// Only fields present (not `undefined`) in `input` are written, so a caller
// can send a genuine partial update. An explicit `null` for a nullable field
// (teamId, points, doplnovacek, pub, note) DOES clear it to null - this is
// distinct from omitting the field entirely, which leaves the existing value
// untouched. (An earlier version used coalesce() for every column, which
// made an explicit null indistinguishable from "not provided" and silently
// ignored attempts to clear a field back to empty.)
export const updateManualResult = async (
  id: string,
  input: Partial<ManualResultInput>
): Promise<ManualResult | null> => {
  const values: unknown[] = [id]
  const assignments: string[] = []

  const setField = (column: string, value: unknown) => {
    values.push(value)
    assignments.push(`${column} = $${values.length}`)
  }

  if (input.teamId !== undefined) setField("team_id", input.teamId)
  if (input.teamName !== undefined) setField("team_name", input.teamName)
  if (input.quizDate !== undefined) setField("quiz_date", input.quizDate)
  if (input.points !== undefined) setField("points", input.points)
  if (input.doplnovacek !== undefined) setField("doplnovacek", input.doplnovacek)
  if (input.pub !== undefined) setField("pub", input.pub)
  if (input.note !== undefined) setField("note", input.note)

  assignments.push("updated_at = now()")

  const result = await queryManualResultsDatabase<ManualResultRow>(
    `
      update public.quiz_manual_results
      set ${assignments.join(", ")}
      where id = $1::bigint and status <> 'rejected'
      returning ${manualResultColumns}
    `,
    values
  )

  return result.rows[0] ? mapManualResultRow(result.rows[0]) : null
}

export const rejectManualResult = async (id: string): Promise<ManualResult | null> => {
  const result = await queryManualResultsDatabase<ManualResultRow>(
    `
      update public.quiz_manual_results
      set status = 'rejected', updated_at = now()
      where id = $1::bigint
      returning ${manualResultColumns}
    `,
    [id]
  )

  return result.rows[0] ? mapManualResultRow(result.rows[0]) : null
}
