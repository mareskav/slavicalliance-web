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

// Uses coalesce() for a partial update, so an omitted field is left
// unchanged. Note this means an explicit `null` for a nullable field
// (teamId, points, doplnovacek, pub, note) is indistinguishable from "not
// provided" and also leaves the existing value in place — there is no way to
// clear one of these fields back to null through this function. Not needed
// by the current admin UI (which only ever sends fields it wants to
// overwrite with a real value); revisit if a "clear this field" affordance
// is added.
export const updateManualResult = async (
  id: string,
  input: Partial<ManualResultInput>
): Promise<ManualResult | null> => {
  const result = await queryManualResultsDatabase<ManualResultRow>(
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
      id,
      input.teamId ?? null,
      input.teamName ?? null,
      input.quizDate ?? null,
      input.points ?? null,
      input.doplnovacek ?? null,
      input.pub ?? null,
      input.note ?? null
    ]
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
