-- Captain manual quiz results — migration
--
-- Source: docs/plans/captain-manual-quiz-results.md, "Schema" section
-- (copied verbatim). Additive and reversible with `drop table
-- public.quiz_manual_results;`.
--
-- Run this in the Neon SQL editor as neondb_owner (or any role that owns
-- the public schema) BEFORE running 002-roles-and-grants.sql, since the
-- grants in that file reference this table. This file is NOT executed by
-- any automation in this repo — run it by hand.

create table public.quiz_manual_results (
  id              bigint generated always as identity primary key,
  team_id         integer,
  team_name       text not null,
  quiz_date       date not null,
  points          numeric,
  order_in_quiz   integer,
  pub             text,
  pub_url         text,
  doplnovacek     numeric,
  clenu           integer,
  max_body_v_kole numeric,
  tip_56_question text,
  league_name     text,
  note            text,
  status          text not null default 'approved'
                    check (status in ('approved', 'rejected')),
  submitted_by    text not null,
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint quiz_manual_results_date_sane check (quiz_date >= date '2015-01-01')
);

create unique index quiz_manual_results_dedup
  on public.quiz_manual_results (coalesce(team_id, -1), team_name, quiz_date, coalesce(pub, ''))
  where status <> 'rejected';

create index quiz_manual_results_team on public.quiz_manual_results (team_id, team_name);
