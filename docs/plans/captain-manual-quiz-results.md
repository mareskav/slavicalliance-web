# Captain manual quiz results — plan

Goal: let a team captain add historical quiz entries through the existing
`/admin` editor, without ever being able to write to the scraper-owned tables
(`quiz_results`, `quiz_leagues`, `quiz_pub_reservations`).

## Decisions

- **Captain identity**: shared `CAPTAIN_PASSWORD` (like `ADMIN_PASSWORD`
  today), not per-person accounts. Session token payload gains a `role`
  claim (`"admin" | "captain"`), signed with the existing `SESSION_SECRET`.
  Tokens without a `role` claim (old sessions) are rejected, not treated as
  admin.
- **Authorization split**: CMS routes (`content/pages`, `content/posts`,
  `uploads`) require `role === "admin"`. The manual-results write route
  accepts both `admin` and `captain`.
- **Moderation**: none. A captain's submission is live immediately
  (`status = "approved"` on insert). Soft-delete only (`status = "rejected"`),
  never a hard `DELETE`, so bad entries stay recoverable.
- **Storage**: a new table, `quiz_manual_results`, physically separate from
  the scraper tables. Same `(team_id, team_name)` shape as `quiz_results` so
  `getTeamKey()` in `apps/results/src/lib/quiz-results.ts` treats a manual
  row and a scraped row for the same team as the same team.
- **DB-level enforcement (the actual boundary)**: a new low-privilege
  Postgres role, `sa_web_rw`, with `INSERT, UPDATE` on `quiz_manual_results`
  only, and no grants at all on the scraper tables. The scraper connects as
  `neondb_owner` (the table owner), which bypasses grants entirely, so this
  REVOKE never affects the scraper. The app's existing read path keeps using
  today's `DATABASE_URL` role; only the new write route uses
  `DATABASE_URL_RW` / `sa_web_rw`. This protects against a bug in the write
  route (wrong query, wrong table) actually touching scraped data — not just
  against a malicious human, since the only human able to reach this route is
  whoever has the admin or captain password.
- **Where the write API lives**: `apps/results`, not `apps/site`. The
  results Worker already has `nodejs_compat` and a working `pg` `Pool`;
  `apps/site`'s Pages project does not have `nodejs_compat` configured, so
  `pg` would not run there without extra deploy-config changes. Both apps
  share the `slavicalliance.cz` origin, so the `sa_admin_session` cookie
  (host-only, `Path=/`) reaches `apps/results` automatically — no CORS, no
  second session mechanism.
- **Reads**: `loadTeamResults` and `loadTeamSummaries` in
  `apps/results/src/lib/quiz-results.ts` `UNION ALL` the two tables and tag
  each row with `source: "scraped" | "manual"` for a UI badge. League and
  special-league standings (`loadRegularLeagueStandingRows`,
  `loadSpecialLeagueStandingRows`, totals) stay scraper-only — unioning there
  risks a manual row silently displacing a scraped row for the same
  round via the existing `distinct on (team_name, league_week)` logic.

## Schema

```sql
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
```

`generated always as identity` instead of `serial` so the `INSERT` grant on
the table is enough — no separate sequence grant needed.

"Not in the future" is enforced in the write route, not a `CHECK` constraint
(`current_date` is STABLE, not IMMUTABLE — Postgres rejects it in a CHECK).

## Roles and grants

Run as `neondb_owner` in the Neon SQL editor (not via Neon Console UI — a
role created through the console/API inherits `neon_superuser`, which
bypasses table grants entirely):

```sql
create role sa_web_rw login password '<set a real password, store as Worker secret>';

grant usage on schema public to sa_web_rw;
grant select on public.quiz_results, public.quiz_leagues,
                public.quiz_pub_reservations, public.quiz_manual_results
  to sa_web_rw;
grant insert, update on public.quiz_manual_results to sa_web_rw;

revoke insert, update, delete, truncate
  on public.quiz_results, public.quiz_leagues, public.quiz_pub_reservations
  from sa_web_rw;
```

Verification (run after creating the role):

```sql
select
  rolname,
  pg_has_role(rolname, 'neon_superuser', 'member') as has_superuser_membership,
  has_table_privilege(rolname, 'public.quiz_results', 'UPDATE') as can_write_scraped,
  has_table_privilege(rolname, 'public.quiz_manual_results', 'INSERT') as can_write_manual
from pg_roles where rolname = 'sa_web_rw';
-- expected: has_superuser_membership=false, can_write_scraped=false, can_write_manual=true
```

Then, connected *as* `sa_web_rw` (not `neondb_owner`), confirm the boundary
directly:

```sql
update public.quiz_results set points = points where false;
-- must fail: ERROR: permission denied for table quiz_results
```

`DATABASE_URL_RW` (the `sa_web_rw` connection string) is set as a Cloudflare
Worker secret (`wrangler secret put DATABASE_URL_RW`) for `apps/results`,
never in `wrangler.jsonc` `vars` (that file is committed to git).

## API

`apps/results/src/app/api/admin/manual-results/route.ts`:

- `GET` — list manual results (for the admin UI's own review/edit view).
- `POST` — insert one manual result.
- `PATCH` — soft-delete (`status = "rejected"`) or edit an existing row.

Every handler:

1. Reads the `sa_admin_session` cookie, verifies the HMAC signature and
   expiry (same logic as `apps/site/functions/_lib/admin.js`, ported to a
   shared helper), and requires `role` to be `"admin"` or `"captain"`.
2. Checks the `Origin` header matches the site origin (the existing admin
   login has no such check; a write endpoint should not rely on
   `SameSite=Lax` alone).
3. Validates input: `quiz_date` not in the future, `points`/`order_in_quiz`
   numeric and non-negative, `team_name` non-empty.
4. Uses a `Pool` built from `DATABASE_URL_RW`, separate from the existing
   read pool.
5. Returns 409 on a dedup-index collision.

## UI

New tab in `apps/site/src/app/admin/AdminEditor.tsx` alongside the existing
page-content tabs. Fetches/posts to
`${resultsAppUrl}/api/admin/manual-results` (same origin in production via
`/vysledky`, proxied in dev the same way the existing quiz-reservations API
is). Shows a simple form (team, date, points, pub, note) and a list of
previously submitted manual results with a "zrušit" (soft-delete) action.

## Testing

No test framework exists in this repo yet (no `vitest`/`jest` dependency,
no `*.test.*` files outside `node_modules`). Add **Vitest** as a root
devDependency (fast, ESM-native, no conflict with Next/Cloudflare tooling,
works for plain unit tests without needing a real browser or a real
Postgres/Workers runtime) and a `test` script per affected workspace
(`apps/site`, `apps/results`) plus a root `npm run test` that runs both.

These are **mock-level unit tests** — no real Postgres connection, no real
Cloudflare Worker runtime, no real HTTP. Every test mocks its one external
boundary (the `pg` `Pool`, `fetch`, or the `Request`/cookie header) and
asserts on inputs/outputs and error paths. They are not a substitute for
running the real SQL migration/grants by hand once, but they catch logic
regressions (auth bypass, wrong table touched, bad validation) on every
future change without needing a live database.

Write each test file **alongside the source file it covers, in the same
step**, not as a separate pass at the end — a step in the rollout order below
isn't done until its test is:

- `apps/site/functions/_lib/admin.test.js` (or `.ts` if the helper is
  ported to TS) — `createSessionCookie`/`getSession` round-trip for both
  roles; a tampered signature is rejected; an expired `exp` is rejected; a
  legacy payload with no `role` field is rejected (fail-closed, not treated
  as admin); `isAdmin` is `true` only for `role: "admin"`.
- `apps/site/functions/api/admin/login.test.js` — correct `ADMIN_PASSWORD`
  → `role: "admin"`; correct `CAPTAIN_PASSWORD` → `role: "captain"`; wrong
  password → 401; `CAPTAIN_PASSWORD` unset in env → captain login attempt
  still cleanly rejected (not a crash on `undefined` comparison).
- `apps/site/functions/api/admin/content/pages/[slug].test.ts` (or a shared
  test covering all three CMS routes with a small parameterized helper) —
  a `captain`-role session gets 401/403, an `admin`-role session succeeds,
  no session gets 401. Mock `env.CONTENT_BUCKET.put` so nothing real is
  written.
- `apps/results/src/lib/admin-session.test.ts` — same coverage as the
  `apps/site` version, since the plan requires the HMAC logic to be
  byte-for-byte compatible across the two apps; ideally the same test
  vectors (same `SESSION_SECRET`, same payload) are asserted in both test
  files so a future edit that desyncs them fails loudly in CI.
- `apps/results/src/app/api/admin/manual-results/route.test.ts` — mock the
  `sa_web_rw` `Pool`'s `query` method. Cover: no/invalid session → 401;
  captain session → allowed on POST; wrong `Origin` header → rejected;
  future `quiz_date` → 400; non-numeric `points` → 400; a mocked Postgres
  `23505` unique-violation error surfaces as 409 with a clear message; a
  successful insert calls `query` with the expected SQL parameters (assert
  on the mock's call args, not on real DB state); PATCH soft-delete sets
  `status = 'rejected'` and never issues a `DELETE`.
- `apps/results/src/lib/quiz-results.test.ts` — the `UNION ALL` mapping
  logic: given mocked rows from both tables, scraped rows get `source:
  "scraped"` and `id` prefixed `'s'`, manual rows get `source: "manual"` and
  `id` prefixed `'m'`, and the two never collide even when the underlying
  numeric ids match. If the union SQL itself isn't easily unit-testable,
  extract the row-mapping/tagging step into a small pure function and test
  that in isolation, with the SQL wiring left for manual/integration
  verification.

Skip: real database integration tests (would need a live Postgres, out of
scope here), and Cloudflare Worker end-to-end tests (would need `wrangler
dev`/Miniflare, disproportionate for this feature's size). If real
integration coverage is wanted later, note it as a follow-up, don't block
this feature on it.

## Rollout order

1. This doc.
2. Migration SQL (table + index) — additive, reversible with `drop table`.
3. Role + grants SQL, run by the user in the Neon SQL editor (real
   credentials never pass through the assistant). Verify with the queries
   above.
4. `DATABASE_URL_RW` Worker secret.
5. Session/role-claim change in `apps/site/functions/_lib/admin.js` +
   `login.js` (`CAPTAIN_PASSWORD`) + gate the existing CMS routes on
   `role === "admin"`, each with its mock test from the Testing section
   above written in the same step.
6. Write API route in `apps/results`, with its mock test.
7. Read-side union in `quiz-results.ts` + UI badge, with its mock test.
8. Admin UI tab.

## Status (2026-09-13)

Steps 1-8 above are done and committed on `feature/special-standings`
(migration/roles run by the user directly against Neon, not through the
assistant). On top of the original MVP, a manual code review turned up one
real bug and four UX gaps, all now fixed and covered by tests:

- **Fixed**: `updateManualResult` used `coalesce($n, column)` for every
  field, which made an explicit `null` (the admin/captain clearing a field
  during edit) indistinguishable from "field omitted" — clearing a field
  silently did nothing. Rewritten to build the `SET` clause dynamically,
  only touching columns whose input is `!== undefined`. See the Lessons
  Learned section in the root `README.md`.
- **Fixed**: `PATCH`'s `pub`/`note` clearing produced `""` instead of
  `null`, inconsistent with `POST`/insert. Normalized to `null`.
- **Fixed** (UX, `ManualResultsPanel.tsx`): "Vymazat" now requires
  `window.confirm(...)` naming the team before soft-deleting.
- **Fixed** (UX): switching "Upravit" to a different row while an unsaved
  edit is open now confirms before discarding it.
- **Fixed** (UX): action errors (edit/reject) now show in a sticky/dismissible
  banner at the top of the panel instead of only inside the add-result form,
  which was easy to miss below a long results list.
- **Fixed** (UX): the team `<select>` (all three render locations — add
  form, mobile edit card, desktop edit row) now has a "Jiný tým (nový
  název)…" option with a free-text input, so an ad-hoc team name can
  actually be entered through the UI (the backend/schema already allowed
  `team_id: null`, but there was no way to reach it from the form other than
  the synthetic option `buildEditTeamOptions` injects for an existing row's
  team already missing from the list).

Test coverage added alongside: 5 new unit tests for `updateManualResult`
(`apps/results/src/lib/manual-results.test.ts`), and 2 new Playwright e2e
tests (`apps/site/e2e/admin-manual-results.spec.ts`) plus a
`page.on("dialog", ...)` handler added to the existing tests so they still
pass now that "Vymazat" pops a confirm dialog.

## Status (2026-09-15)

Rollout step 5 (the site-side role/session work) had been implemented but
was sitting uncommitted, and got mis-classified in an earlier session as
"unrelated CMS/admin WIP" and excluded from the PR. It's actually the
missing site half of this feature — without it, `CAPTAIN_PASSWORD` login
did nothing on `apps/site` and `ManualResultsPanel` wasn't reachable from
`/admin` at all. Committed now, split by concern:

- `apps/site/functions/_lib/admin.js`: `getSession` returns a role
  (`admin`/`captain`) instead of a bare boolean; `isAdmin`/`isAuthenticated`
  built on top. Covered by `admin.test.js`.
- `login.js`: accepts `CAPTAIN_PASSWORD` alongside `ADMIN_PASSWORD`, signs
  the role into the session cookie. `session.js` exposes the role. Covered
  by `login.test.js`.
- `content/pages/[slug].ts`, `content/posts/[slug].ts`, `uploads.ts`: gated
  on `isAdmin` instead of `isAuthenticated`, so a captain session is
  rejected from editing site content/uploading assets — this is the actual
  security boundary between the two roles. Covered by `cms-routes.test.js`
  (no session / captain session / admin session, for all three routes).
- `AdminEditor.tsx`: wires in `ManualResultsPanel`, branches the whole tab
  UI on role — admin gets the existing page tabs plus "Historické
  výsledky", captain goes straight to `ManualResultsPanel` with no page
  tabs or Markdown editor rendered. Active tab persists via
  `localStorage`.

PR opened: `feature/special-standings` → `main` on GitHub
(mareskav/slavicalliance-web#6). Not merged — still needs the e2e run and
manual smoke test below before that's reasonable.

**Scope reminder**: this feature stays a minimal "add one historical result
for one team" admin UI (see `CLAUDE.md`'s MVP framing). The "Admin UX
follow-ups" list below is ideas for later, not a committed roadmap — don't
build ahead of an actual request.

**Verified 2026-09-15**: manual results (`quiz_manual_results`) never count
toward league standings, confirmed by reading
`apps/results/src/lib/quiz-results.ts` — `loadRegularLeagueStandingRows`
(dlouhodobé ligy) and `loadSpecialLeagueStandingRows` (speciální ligy incl.
Praha finále) both query only `public.quiz_results`; `quiz_manual_results` is
unioned in only for a single team's own results page
(`loadTeamResults`/`loadTeamSummaries`). The info banner in
`ManualResultsPanel.tsx` already states this correctly — no change needed.

A Czech admin/usage guide for the captain covering the whole `/admin` flow
lives at [`docs/admin-navod-kapitan.md`](../admin-navod-kapitan.md).

## Next steps (pick up here)

1. **Run the e2e suite for real at least once.** It's been type-checked and
   `playwright test --list` confirms all 8 tests load, but none have
   actually executed in this environment — there's no local
   `ADMIN_PASSWORD`/`DATABASE_URL`/`DATABASE_URL_RW` or a running local
   Postgres available to the assistant, and no schema for the
   scraper-owned tables (`quiz_results`, `teams`, `quiz_pub_reservations`,
   `quiz_leagues`) exists anywhere in this repo to stand one up from
   scratch — only `apps/results/sql/001-quiz-manual-results.sql` and
   `002-roles-and-grants.sql`. Set up `apps/site/.env.local` (see root
   `README.md` → Environment Variables) against a Postgres that already has
   that schema, then run:

   ```bash
   npm run dev --prefix apps/site
   npm run dev --prefix apps/results
   npx playwright test apps/site/e2e/admin-manual-results.spec.ts --project=chromium
   ```

2. **Manually smoke-test both roles in a real browser** once that Postgres
   + `.env.local` exist: log in as `admin` and as `captain`
   (`CAPTAIN_PASSWORD`), exercise add/edit/reject, the new ad-hoc team entry,
   and the discard-edit prompt, on both desktop and mobile widths. Also
   confirm a captain login can no longer reach `PUT
   /api/admin/content/pages/*` or `POST /api/admin/uploads` (401).
3. **Merge the PR** (mareskav/slavicalliance-web#6) once 1-2 are done. Ask
   again before merging — this is a standing rule, not a one-time
   confirmation from opening it.

### Admin UX follow-ups, roughly in priority order

Not yet scoped or started; flagging so a future session doesn't have to
rediscover them from scratch.

1. **No positive save feedback.** The error banner (sticky, dismissible) has
   no counterpart for success — after "Přidat výsledek" or "Uložit" the form
   just clears and the list refreshes silently. If the new/edited row sorts
   below the fold, a captain has no confirmation the save actually happened.
   Cheapest fix: a transient "Uloženo" banner reusing the existing sticky
   banner slot, or briefly highlighting the affected row.
2. **Ad-hoc rows (`team_id: null`) aren't flagged in the admin list.** The
   public `TeamTable` shows a "Ručně" badge; the admin table/cards in
   `ManualResultsPanel.tsx` show nothing, so a typo in the free-text "Jiný
   tým" field silently creates an orphaned team with no visual warning where
   it'd actually get caught. Also: the free-text input has no fuzzy-match
   against `teams` (loaded via `/vysledky/api/admin/teams`), so a near-miss
   typo of an existing team name creates a second, disconnected team instead
   of surfacing "did you mean X?".
3. **`submittedBy`/`submittedAt`/`updatedAt` are stored but never shown.**
   Fine today with a single captain; becomes relevant the moment a second
   person gets `CAPTAIN_PASSWORD` — no way to tell who entered or last
   touched a row.
4. **No search/filter/pagination** on the results list. Not a problem yet at
   current volume (see the "current usage" note in the root `CLAUDE.md`),
   but worth watching as the table grows.
5. **Cosmetic**: native `window.confirm()` dialogs (delete, discard-edit)
   look inconsistent with the rest of the dark-themed panel. Not worth
   fixing until the panel gets an actual modal component for something
   else.

Still explicitly out of scope, not just deprioritized: an "unreject" action
for soft-deleted rows (intentional MVP boundary — see `CLAUDE.md`'s MVP
note; revisit only as a deliberate decision, not a drive-by fix).
