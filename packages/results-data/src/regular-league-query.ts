// A profile id can be shared by different names; a name can have many profiles.
// Keep both. Venue only resolves missing ids when exactly one known profile of
// that name played there in this league period. Never split travelling profiles.
export const regularLeagueStandingQuery = (membershipFilter: string) => `
  with result_candidates as (
    select *,
      coalesce(nullif(rtrim(trim(pub_url), '/'), ''), nullif(trim(pub), ''), 'unknown-event:' || id) as venue_key,
      nullif(trim(regexp_replace(trim(pub), '[[:space:]]+(PO|ÚT|ST|ČT|PÁ|SO|NE)$', '')), '') as team_pub,
      (coalesce(points, 0) - coalesce(doplnovacek, 0))::float8 as league_points,
      floor((quiz_date - $1::date)::numeric / 7)::int as league_week
    from public.quiz_results
    where quiz_date between $1 and $2
      and nullif(trim(league_name), '') is null${membershipFilter}
  ),
  venue_profiles as (
    select team_name, venue_key, count(distinct team_id) as profile_count, min(team_id) as profile_id
    from result_candidates
    group by team_name, venue_key
  ),
  resolved_results as (
    select c.*,
      coalesce(c.team_id, case when v.profile_count = 1 then v.profile_id end) as resolved_team_id
    from result_candidates c
    join venue_profiles v using (team_name, venue_key)
  ),
  results_in_league as (
    select *,
      case when resolved_team_id is not null
        then jsonb_build_array('profile', resolved_team_id)::text
        else jsonb_build_array('venue', venue_key)::text end as identity_key
    from resolved_results
  ),
  picked_results as (
    select distinct on (team_name, identity_key, league_week)
      resolved_team_id as team_id, team_name, identity_key, team_pub,
      league_points, quiz_date, id, league_week + 1 as league_round
    from results_in_league
    order by team_name, identity_key, league_week, quiz_date desc, id desc
  ),
  team_totals as (
    select team_id, team_name, identity_key,
      (array_agg(team_pub order by quiz_date desc, id desc))[1] as team_pub,
      json_agg(json_build_object('round', league_round, 'points', league_points, 'date', quiz_date)
        order by league_round, quiz_date, id) as league_results
    from picked_results
    group by team_id, team_name, identity_key
  )
  select team_id, team_name, identity_key, team_pub, league_results,
    count(*) over (partition by team_name)::int as duplicate_name_count
  from team_totals
  order by team_name, team_id nulls last, identity_key
`
