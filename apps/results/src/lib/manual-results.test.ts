import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ManualResultRow } from "./manual-results"

const { queryManualResultsDatabase } = vi.hoisted(() => ({
  queryManualResultsDatabase: vi.fn()
}))

vi.mock("./manual-results-db", () => ({ queryManualResultsDatabase }))

const { mapManualResultRow, updateManualResult } = await import("./manual-results")

const baseRow: ManualResultRow = {
  id: "1",
  team_id: 42,
  team_name: "Slavic Alliance",
  quiz_date: new Date("2026-01-10T00:00:00.000Z"),
  points: 80,
  doplnovacek: 3,
  pub: "Test Pub",
  note: "note",
  status: "approved",
  submitted_by: "captain",
  submitted_at: new Date("2026-01-10T12:00:00.000Z"),
  updated_at: new Date("2026-01-11T12:00:00.000Z")
}

describe("mapManualResultRow", () => {
  it("maps snake_case DB columns to camelCase fields", () => {
    const result = mapManualResultRow(baseRow)

    expect(result).toEqual({
      id: "1",
      teamId: 42,
      teamName: "Slavic Alliance",
      quizDate: "2026-01-10T00:00:00.000Z",
      points: 80,
      doplnovacek: 3,
      pub: "Test Pub",
      note: "note",
      status: "approved",
      submittedBy: "captain",
      submittedAt: "2026-01-10T12:00:00.000Z",
      updatedAt: "2026-01-11T12:00:00.000Z"
    })
  })

  it("passes through null points and doplnovacek without coercion", () => {
    const result = mapManualResultRow({ ...baseRow, points: null, doplnovacek: null })

    expect(result.points).toBeNull()
    expect(result.doplnovacek).toBeNull()
  })

  it("coerces numeric-string points/doplnovacek (as returned by pg for numeric columns) to numbers", () => {
    const result = mapManualResultRow({
      ...baseRow,
      points: "80.5" as unknown as number,
      doplnovacek: "3" as unknown as number
    })

    expect(result.points).toBe(80.5)
    expect(result.doplnovacek).toBe(3)
  })

  it("preserves a null teamId (ad-hoc team entries)", () => {
    const result = mapManualResultRow({ ...baseRow, team_id: null })

    expect(result.teamId).toBeNull()
  })

  it("preserves the rejected status for soft-deleted rows", () => {
    const result = mapManualResultRow({ ...baseRow, status: "rejected" })

    expect(result.status).toBe("rejected")
  })
})

describe("updateManualResult", () => {
  beforeEach(() => {
    queryManualResultsDatabase.mockReset()
    queryManualResultsDatabase.mockResolvedValue({ rows: [baseRow] })
  })

  it("only sets columns for fields present in the input, leaving omitted fields untouched", async () => {
    await updateManualResult("1", { points: 42 })

    const [sql, values] = queryManualResultsDatabase.mock.calls[0]
    expect(sql).toContain("points = $2")
    expect(sql).not.toContain("team_id =")
    expect(sql).not.toContain("team_name =")
    expect(sql).not.toContain("pub =")
    expect(sql).not.toContain("note =")
    expect(values).toEqual(["1", 42])
  })

  it("writes an explicit null for a nullable field, distinct from omitting it", async () => {
    await updateManualResult("1", { pub: null, note: null, teamId: null, points: null, doplnovacek: null })

    const [sql, values] = queryManualResultsDatabase.mock.calls[0]
    expect(sql).toContain("pub = $")
    expect(sql).toContain("note = $")
    expect(sql).toContain("team_id = $")
    expect(sql).toContain("points = $")
    expect(sql).toContain("doplnovacek = $")
    expect(values).toEqual(["1", null, null, null, null, null])
  })

  it("always bumps updated_at even when no fields are provided", async () => {
    await updateManualResult("1", {})

    const [sql, values] = queryManualResultsDatabase.mock.calls[0]
    expect(sql).toContain("updated_at = now()")
    expect(values).toEqual(["1"])
  })

  it("excludes rejected rows from the update", async () => {
    await updateManualResult("1", { points: 10 })

    const [sql] = queryManualResultsDatabase.mock.calls[0]
    expect(sql).toContain("status <> 'rejected'")
  })

  it("returns null when no row matched", async () => {
    queryManualResultsDatabase.mockResolvedValue({ rows: [] })

    const result = await updateManualResult("999", { points: 10 })

    expect(result).toBeNull()
  })
})
