# Project notes for AI assistants

## Admin manual-results feature: current scope is MVP

`ManualResultsPanel.tsx` (the "Historické výsledky" admin tab) is the first
slice of a larger admin/results feature. For now, admin usage is expected to
be almost entirely about entering historical quiz results by hand (one row at
a time, per the Neon-awareness rules below) — not bulk data management, not
editing scraped results, not managing teams/pubs directly. Treat the current
feature set (create/edit/reject one manual result at a time, team select,
points, doplňovačky, pub, note) as an intentionally minimal MVP: prefer
extending it incrementally over redesigning it, and don't assume a small,
rough edge (e.g. no bulk edit, no undo) is a bug unless it blocks the
historical-results workflow specifically.

## Neon (production Postgres) awareness

Production `apps/results` and `apps/site` talk to Neon serverless Postgres
(`DATABASE_URL` / `DATABASE_URL_RW`). Neon bills/limits on active compute
time and connection count, and a serverless branch can suspend and need to
wake on a new connection. Keep this in mind whenever you touch code that
issues queries:

- Prefer batching writes behind an explicit user action (e.g. one "Uložit"
  click that sends a single PATCH/POST) over per-keystroke or per-field
  autosave. Admin UIs in this repo (see `ManualResultsPanel.tsx`) intentionally
  edit one row at a time and only write on explicit Save/Submit.
- Prefer `unstable_cache` (see the `getKnownPubNames`/`getKnownTeams` pattern
  in `apps/results/src/lib/quiz-results.ts`) for slow-changing, DB-derived
  data instead of querying on every request.
- Avoid adding polling loops or frequent background refetches against Neon;
  if live-ish data is needed, favor a sane revalidate window over a tight
  interval.
- Reuse pooled connections (`Pool` in `manual-results-db.ts` / `dev.mjs`)
  rather than opening a new client per request.

When adding a new DB-touching feature, briefly consider whether it could
multiply connections/queries under normal use (e.g. one row open for editing
vs. N rows all autosaving), and default to the more conservative design.

Current usage (a single admin, one row at a time) is well within Neon limits
even at hundreds of writes/week — active compute time and connection count are
what's billed/limited, not total historical request count. If multiple
admins/captains ever edit concurrently, each Cloudflare Worker isolate opens
its own `pg.Pool` (`manual-results-db.ts`, `max: 2`), so concurrent requests
could stack connections faster than expected. Not urgent today, but if that
happens, consider pointing `DATABASE_URL_RW` at Neon's pooled (`-pooler`)
connection endpoint as a safeguard.
