import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  aggregateLeagueNamePattern,
  specialLeagueCatalogueQuery,
  specialLeagueStandingQuery
} from "./special-league-query"

const postgres = process.env.QUIZ_TEST_DATABASE_URL ? describe : describe.skip
postgres("special catalogue and standings in PostgreSQL", () => {
  let client: Client
  beforeAll(async () => {
    client = new Client({ connectionString: process.env.QUIZ_TEST_DATABASE_URL })
    await client.connect()
    await client.query(`create temp table special_results_test (
      id serial, team_id int, team_name text, quiz_date date, pub text, pub_url text,
      points float8, doplnovacek int, league_name text)`)
    await client.query(`create temp table special_catalogue_test (
      id serial, league_name text, period_start date default '2026-01-01',
      period_stop date default '2026-01-07', league_url text)`)
    await client.query(`insert into special_catalogue_test (league_name,league_url) values
      ('Hudební speciál jaro 2023','/music'), ('Fotbalová liga','/football'),
      ('Finále jaro 2026','/final'), ('Finále Praha','https://www.hospodskykviz.cz/vysledky/461'),
      ('Týdenní liga','/week'), ('Letní liga Čechy','/summer'), ('Rok 2025 na Hospodském kvízu','/year'),
      ('Celá republika 2020','/national'), ('Česká republika jaro 2024','/national2'),
      ('Praha a střední Čechy jaro 2026','/region'), ('Střední, severní Morava a Slezsko jaro 2026','/region2'),
      ('Prázdný speciál','/empty')`)
    await client.query(`insert into special_results_test (team_name,league_name,points,quiz_date)
      select 'Fixture', league_name, 10, '2026-01-01'::date from special_catalogue_test where league_name <> 'Prázdný speciál'`)
    await client.query(`insert into special_results_test (team_name,league_name,points,quiz_date)
      values ('Old event','Prázdný speciál',20,'2025-01-01'),('Wrong year','Identity',100,'2025-01-01')`)
    await client.query(`insert into special_results_test (team_id,team_name,quiz_date,pub,pub_url,points,league_name) values
      (10,'Homonym','2026-01-01','A','/a',40,'Identity'),
      (20,'Homonym','2026-01-01','B','/b',30,'Identity'),
      (10,'Homonym','2026-01-02','C','/c',45,'Identity'),
      (10,'Another name','2026-01-01','A','/a',20,'Identity'),
      (null,'Legacy','2026-01-01','D','/d',25,'Identity'),
      (30,'Legacy','2026-01-02','D','/d',26,'Identity'),
      (null,'Unknown','2026-01-01','E','/e',15,'Identity'),
      (null,'Unknown','2026-01-01','F','/f',16,'Identity'),
      (40,'Ambiguous','2026-01-01','G','/g',10,'Identity'),
      (50,'Ambiguous','2026-01-02','G','/g',11,'Identity'),
      (null,'Ambiguous','2026-01-03','G','/g',12,'Identity')`)
    await client.query(`insert into special_results_test (team_id,team_name,quiz_date,pub,pub_url,points,doplnovacek,league_name) values
      (60,'Bonus leader','2026-01-01','H','/h',45,10,'Scoring'),
      (70,'Official leader','2026-01-01','I','/i',40,0,'Scoring'),
      (80,'No bonus','2026-01-01','J','/j',38,null,'Scoring')`)
  })
  afterAll(async () => {
    await client?.end()
  })
  it("includes themes and real finals with results, excluding aggregates and empty events", async () => {
    const sql = specialLeagueCatalogueQuery
      .replaceAll("public.quiz_leagues", "pg_temp.special_catalogue_test")
      .replaceAll("public.quiz_results", "pg_temp.special_results_test")
    const rows = (await client.query(sql, [aggregateLeagueNamePattern])).rows
    expect(rows.map((row) => row.league_name).sort()).toEqual([
      "Finále jaro 2026",
      "Fotbalová liga",
      "Hudební speciál jaro 2023"
    ])
  })
  it("keeps distinct profiles and unknown venues apart while preserving travelling profiles", async () => {
    const sql = specialLeagueStandingQuery.replaceAll(
      "public.quiz_results",
      "pg_temp.special_results_test"
    )
    const rows = (await client.query(sql, ["Identity", "2026-01-01", "2026-01-07"])).rows
    expect(rows.some((row) => row.team_name === "Wrong year")).toBe(false)
    const homonyms = rows.filter((row) => row.team_name === "Homonym")
    expect(homonyms).toHaveLength(2)
    expect(homonyms[0].league_results.map((r: { points: number }) => r.points)).toEqual([40, 45])
    expect(homonyms[1].league_results.map((r: { points: number }) => r.points)).toEqual([30])
    expect(homonyms.map((row) => row.duplicate_name_count)).toEqual([2, 2])
    expect(rows.filter((row) => row.team_name === "Another name")).toHaveLength(1)
    const legacy = rows.filter((row) => row.team_name === "Legacy")
    expect(legacy).toHaveLength(1)
    expect(legacy[0].team_id).toBe(30)
    expect(legacy[0].league_results).toHaveLength(2)
    expect(rows.filter((row) => row.team_name === "Unknown")).toHaveLength(2)
    expect(rows.filter((row) => row.team_name === "Ambiguous")).toHaveLength(3)
  })
  it("uses official standings points excluding the supplement bonus, including a missing bonus", async () => {
    const sql = specialLeagueStandingQuery.replaceAll(
      "public.quiz_results",
      "pg_temp.special_results_test"
    )
    const rows = (await client.query(sql, ["Scoring", "2026-01-01", "2026-01-07"])).rows
    const points = new Map(rows.map((row) => [row.team_name, row.league_results[0].points]))
    expect(points.get("Bonus leader")).toBe(35)
    expect(points.get("Official leader")).toBe(40)
    expect(points.get("No bonus")).toBe(38)
  })
})
