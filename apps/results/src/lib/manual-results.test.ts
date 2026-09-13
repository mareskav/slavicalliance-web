import { describe, expect, it } from "vitest"
import { mapManualResultRow, type ManualResultRow } from "./manual-results"

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
