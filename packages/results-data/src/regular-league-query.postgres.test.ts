import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { regularLeagueStandingQuery } from "./regular-league-query"

// Real SQL semantics; all writes are confined to one session-local temp table.
const postgres = process.env.QUIZ_TEST_DATABASE_URL ? describe : describe.skip
postgres("regular standings identity in PostgreSQL", () => {
  let client: Client
  beforeAll(async () => {
    client = new Client({ connectionString: process.env.QUIZ_TEST_DATABASE_URL })
    await client.connect()
    await client.query(`create temp table standings_test (
      id serial, team_id int, team_name text, quiz_date date, pub text, pub_url text,
      points float8, doplnovacek int, league_name text)`)
    await client.query(`insert into standings_test (team_id,team_name,quiz_date,pub,pub_url,points,doplnovacek,league_name) values
      (10,'Homonym','2026-09-14','A','/a',40,0,null),
      (20,'Homonym','2026-09-15','B','/b',30,0,null),
      (10,'Homonym','2026-09-21','C','/c',45,2,null),
      (20,'Homonym','2026-09-22','B','/b',31,0,null),
      (10,'Another name','2026-09-14','A','/a',20,0,null),
      (null,'Legacy','2026-09-14','D','/d',25,0,null),
      (30,'Legacy','2026-09-21','D','/d',26,0,null),
      (null,'Unknown','2026-09-14','E','/e',15,0,null),
      (null,'Unknown','2026-09-15','F','/f',16,0,null),
      (10,'Homonym','2026-09-23','C','/c',99,0,'Special'),
      (20,'Homonym','2026-09-23','B','/b',32,0,null),
      (40,'Ambiguous','2026-09-14','G','/g',10,0,null),
      (50,'Ambiguous','2026-09-15','G','/g',11,0,null),
      (null,'Ambiguous','2026-09-21','G','/g',12,0,null)`)
  })
  afterAll(async () => {
    await client?.end()
  })
  const rows = async () =>
    (
      await client.query(
        regularLeagueStandingQuery("").replaceAll("public.quiz_results", "pg_temp.standings_test"),
        ["2026-09-14", "2026-09-27"]
      )
    ).rows
  it("keeps homonyms separate and a travelling profile together; picks one regular event per week", async () => {
    const data = (await rows()).filter((row) => row.team_name === "Homonym")
    expect(data).toHaveLength(2)
    expect(data.map((row) => row.duplicate_name_count)).toEqual([2, 2])
    expect(data[0].league_results.map((r: { points: number }) => r.points)).toEqual([40, 43])
    expect(data[1].league_results.map((r: { points: number }) => r.points)).toEqual([30, 31]) // first quiz of the week counts, the later 32 does not
  })
  it("does not merge different names sharing an id, and resolves only unambiguous missing ids", async () => {
    const data = await rows()
    expect(data.find((row) => row.team_name === "Another name").league_results).toHaveLength(1)
    const legacy = data.filter((row) => row.team_name === "Legacy")
    expect(legacy).toHaveLength(1)
    expect(legacy[0].team_id).toBe(30)
    expect(legacy[0].league_results).toHaveLength(2)
    const unknown = data.filter((row) => row.team_name === "Unknown")
    expect(unknown).toHaveLength(2)
    expect(new Set(unknown.map((row) => row.identity_key)).size).toBe(2)
    const ambiguous = data.filter((row) => row.team_name === "Ambiguous")
    expect(ambiguous).toHaveLength(3)
    expect(ambiguous.some((row) => row.team_id === null)).toBe(true)
  })
})
