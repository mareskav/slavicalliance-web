import { describe, expect, it } from "vitest"
import { mapCombinedQuizResultRow, type CombinedQuizResultRow } from "./quiz-results"

const baseRow: CombinedQuizResultRow = {
  id: "5",
  source: "scraped",
  team_id: 42,
  team_name: "Slavic Alliance",
  order_in_quiz: 1,
  points: 100,
  quiz_date: new Date("2026-01-15T00:00:00.000Z"),
  pub: "Test Pub",
  pub_url: "https://example.com/pub",
  quiz_details_id: "123",
  tip_56_question: "Test question",
  doplnovacek: 5,
  clenu: 6,
  max_body_v_kole: 120,
  league_name: null
}

describe("mapCombinedQuizResultRow", () => {
  it("prefixes a scraped row's id with 's' and tags it as scraped", () => {
    const result = mapCombinedQuizResultRow({ ...baseRow, id: "5", source: "scraped" })

    expect(result.id).toBe("s5")
    expect(result.source).toBe("scraped")
  })

  it("prefixes a manual row's id with 'm' and tags it as manual", () => {
    const result = mapCombinedQuizResultRow({ ...baseRow, id: "5", source: "manual" })

    expect(result.id).toBe("m5")
    expect(result.source).toBe("manual")
  })

  it("never collides between a scraped and a manual row with the same underlying numeric id", () => {
    const scraped = mapCombinedQuizResultRow({ ...baseRow, id: "7", source: "scraped" })
    const manual = mapCombinedQuizResultRow({ ...baseRow, id: "7", source: "manual" })

    expect(scraped.id).not.toBe(manual.id)
    expect(scraped.id).toBe("s7")
    expect(manual.id).toBe("m7")
  })

  it("nulls out the quiz details link for manual rows even if a raw value slipped through", () => {
    const result = mapCombinedQuizResultRow({ ...baseRow, source: "manual", quiz_details_id: "999" })

    expect(result.quizDetailsUrl).toBeNull()
  })

  it("builds a quiz details link for scraped rows", () => {
    const result = mapCombinedQuizResultRow({ ...baseRow, source: "scraped", quiz_details_id: "123" })

    expect(result.quizDetailsUrl).toContain("123")
  })

  it("maps numeric fields and dates", () => {
    const result = mapCombinedQuizResultRow(baseRow)

    expect(result.points).toBe(100)
    expect(result.maxBodyVKole).toBe(120)
    expect(result.quizDate).toBe("2026-01-15T00:00:00.000Z")
  })

  it("passes through null points and pub without coercion", () => {
    const result = mapCombinedQuizResultRow({ ...baseRow, points: null, pub: null, pub_url: null })

    expect(result.points).toBeNull()
    expect(result.pub).toBeNull()
    expect(result.pubUrl).toBe("#")
  })
})
