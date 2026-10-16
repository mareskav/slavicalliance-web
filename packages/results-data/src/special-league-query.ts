// The catalogue contains both events and aggregate standings. Do not classify
// by duration: summer themes can run for a month and regional finals can have
// a whole season's dates in the upstream catalogue.
export const aggregateLeagueNamePattern =
  "^(rok[[:space:]]+[0-9]{4}|all time|týdenní liga|letní liga|nováčkovská liga|test[[:space:]]|česká republika|celá republika|jižní (a západní čechy|morava)|praha a střední čechy|severní a východní čechy|střední(,| a) severní morava)"

export const specialLeagueCatalogueQuery = `
  select l.id::int, l.league_name, l.period_start, l.period_stop, l.league_url
  from public.quiz_leagues l
  where trim(l.league_name) !~* $1
    and l.league_url is distinct from 'https://www.hospodskykviz.cz/vysledky/461'
    and exists (
      select 1 from public.quiz_results r
      where trim(r.league_name) = trim(l.league_name)
        and r.quiz_date between l.period_start and l.period_stop
    )
  order by l.period_stop desc, l.period_start desc, l.id desc
`

// Preserve profiles across venues, separate names sharing a profile id, and
// resolve missing ids only where one same-name profile played at that venue.
export const specialLeagueStandingQuery = `
  with result_candidates as (
    select *,
      coalesce(nullif(rtrim(trim(pub_url), '/'), ''), nullif(trim(pub), ''), 'unknown-event:' || id) as venue_key,
      nullif(trim(regexp_replace(trim(pub), '[[:space:]]+(PO|ÚT|ST|ČT|PÁ|SO|NE)$', '')), '') as team_pub
    from public.quiz_results
    where trim(league_name) = $1
      and quiz_date between $2::date and $3::date
  ),
  venue_profiles as (
    select team_name, venue_key, count(distinct team_id) as profile_count, min(team_id) as profile_id
    from result_candidates group by team_name, venue_key
  ),
  resolved_results as (
    select c.*, coalesce(c.team_id, case when v.profile_count = 1 then v.profile_id end) as resolved_team_id
    from result_candidates c join venue_profiles v using (team_name, venue_key)
  ),
  results_in_league as (
    select *, case when resolved_team_id is not null
      then jsonb_build_array('profile', resolved_team_id)::text
      else jsonb_build_array('venue', venue_key)::text end as identity_key
    from resolved_results
  ),
  numbered_results as (
    select *, dense_rank() over (partition by team_name, identity_key order by quiz_date, id) as league_round
    from results_in_league
  )
  select resolved_team_id as team_id, team_name, identity_key,
    (array_agg(team_pub order by quiz_date desc, id desc))[1] as team_pub,
    count(*) over (partition by team_name)::int as duplicate_name_count,
    json_agg(json_build_object('round', league_round, 'points', (coalesce(points, 0) - coalesce(doplnovacek, 0))::float8, 'date', quiz_date)
      order by league_round, quiz_date, id) as league_results
  from numbered_results
  group by resolved_team_id, team_name, identity_key
  order by team_name, team_id nulls last, identity_key
`
