-- Manual quiz results — roles and grants
--
-- Source: docs/plans/manual-quiz-results.md, "Roles and grants"
-- section (copied verbatim). Run AFTER 001-quiz-manual-results.sql, as
-- neondb_owner, in the Neon SQL editor (NOT via the Neon Console UI — a
-- role created through the console/API inherits neon_superuser, which
-- bypasses table grants entirely). Real credentials never pass through the
-- assistant; this file is NOT executed by any automation in this repo —
-- run it by hand, then set the resulting connection string as the
-- DATABASE_URL_RW Worker secret for apps/results
-- (`wrangler secret put DATABASE_URL_RW`), never in wrangler.jsonc `vars`.

create role sa_web_rw login password '<set a real password, store as Worker secret>';

grant usage on schema public to sa_web_rw;
grant select on public.quiz_results, public.quiz_leagues,
                public.quiz_pub_reservations, public.quiz_manual_results
  to sa_web_rw;
grant insert, update on public.quiz_manual_results to sa_web_rw;

revoke insert, update, delete, truncate
  on public.quiz_results, public.quiz_leagues, public.quiz_pub_reservations
  from sa_web_rw;

-- Verification (run after creating the role):

select
  rolname,
  pg_has_role(rolname, 'neon_superuser', 'member') as has_superuser_membership,
  has_table_privilege(rolname, 'public.quiz_results', 'UPDATE') as can_write_scraped,
  has_table_privilege(rolname, 'public.quiz_manual_results', 'INSERT') as can_write_manual
from pg_roles where rolname = 'sa_web_rw';
-- expected: has_superuser_membership=false, can_write_scraped=false, can_write_manual=true

-- Then, connected *as* sa_web_rw (not neondb_owner), confirm the boundary
-- directly:

update public.quiz_results set points = points where false;
-- must fail: ERROR: permission denied for table quiz_results
