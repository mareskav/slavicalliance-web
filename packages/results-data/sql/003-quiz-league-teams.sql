-- League membership: which teams each hospodskykviz.cz league page lists.
--
-- The scraper (quiz-scrapper, sync_league_teams.py) keeps this table up to
-- date; this file only creates it up front and grants read access so the
-- results app can filter league standings by it. Run by hand as
-- neondb_owner in the Neon SQL editor. Until the table is filled (or if it is
-- missing/not readable) the app shows league standings unfiltered.

create table if not exists public.quiz_league_teams (
  league_url text not null,
  team_name text not null,
  pub text not null default '',
  city text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (league_url, team_name, pub, city)
);

grant select on public.quiz_league_teams to sa_web_rw;
-- Also grant select to the role behind the read-only DATABASE_URL, if it is
-- a different role:
-- grant select on public.quiz_league_teams to <read_role>;
