# Slavic Alliance Web

Monorepo for the public Slavic Alliance website, quiz reservation overview, and quiz results pages.

## Workspace

- `apps/site`: static Next export deployed to Cloudflare Pages. The public site includes the homepage, posts, `/kvizy`, and the Markdown admin editor. `/vysledky` is rendered client-side from JSON snapshots. Runtime content, admin and quiz-reservation APIs are Cloudflare Pages Functions (`apps/site/functions`).
- `packages/results-data`: shared Postgres queries, snapshot builders, SQL migrations (`sql/`) and tests for the results data.
- `packages/ui`: shared layout and UI components.

## Data Sources

- Site content lives as Markdown under `contents/pages/*` and `contents/posts/*`. In production, the Cloudflare Pages Functions read and write that content from the `CONTENT_BUCKET` R2 binding.
- Uploaded admin assets are stored in the same R2 bucket under `uploads/*` and are served through `/api/assets/*`.
- Quiz data comes from PostgreSQL:
  - `public.quiz_results` for team result history.
  - `public.quiz_leagues` for the long-term league window and metadata.
  - `public.quiz_pub_reservations` for upcoming pub quiz reservations.
  - `public.quiz_manual_results` for team result history entered manually by an admin through `/admin`, unioned into the team result history alongside `quiz_results`.
- Results pages (`/vysledky`) read public JSON snapshots (`index.json`, `team/*`, `league/*`, `special/*`) from the R2 bucket `slavicalliance-results-data`, served at `https://data.slavicalliance.cz` with `Cache-Control: public, max-age=60`. `npm run publish:results` (GitHub workflow `publish-results.yml`) rebuilds them from Postgres; it runs on a cron, on `workflow_dispatch`, after quiz-scrapper syncs, and after admin saves. An admin save also patches the touched team snapshots immediately inside the Function, and that browser bypasses the cache for a few minutes.

Regular league identity rules, the 16 October homonym fix and PostgreSQL checks:
[packages/results-data/README.md](packages/results-data/README.md).

## Local Development

Create `.env.local` from `.env.example`, then run:

```bash
npm install
npm run dev
```

Local URLs:

- Site: `http://localhost:3000`
- Results: `http://localhost:3000/vysledky` (needs snapshots, see below)
- Admin editor: `http://localhost:3000/admin`

The site dev server proxies local content/admin APIs and handles `/api/quiz-reservations`.

To develop the results pages locally, build snapshots from a database and serve them:

```bash
npm run publish:results:dry   # writes ./.snapshots
npm run serve:snapshots       # http://localhost:4010
# apps/site/.env.local: NEXT_PUBLIC_RESULTS_DATA_URL=http://localhost:4010
```

Useful single-app commands:

```bash
npm run dev:site
npm run build:site
npm run publish:results:dry
npm run test
```

## Environment Variables

Use the root `.env.local` for normal monorepo development. App-level `.env.local` files still work when running a workspace directly.

- `DATABASE_URL`: PostgreSQL connection string for quiz results and reservations.
- `NEXT_PUBLIC_RESULTS_DATA_URL`: base URL of the results snapshots; defaults to `https://data.slavicalliance.cz`.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`: used only by `publish:results` to upload snapshots.
- `GITHUB_DISPATCH_TOKEN`, `GITHUB_REPO`: Pages Function secrets used to trigger `publish-results.yml` after an admin save.
- `CONTENT_SITE_URL`: optional source for production site builds to fetch live Markdown content from `/api/content/pages/landing`; defaults to `https://slavicalliance.cz` in production.
- `ADMIN_PASSWORD`: password for `/admin`.
- `SESSION_SECRET`: HMAC secret for the admin session cookie.
- `DATABASE_URL_RW`: PostgreSQL connection string for the low-privilege `sa_web_rw` role used only by the manual-results write API (`insert`/`update` on `quiz_manual_results`, no access to the scraper-owned tables). See `docs/plans/manual-quiz-results.md` and `packages/results-data/sql/`.
- `DEPLOY_HOOK_URL`: optional Cloudflare Pages deploy hook called after editing the landing page in admin.

## Cloudflare Setup

Create these Cloudflare resources:

- Pages project: `slavicalliance-site`
- R2 bucket for site content and uploads: `slavicalliance-site-content`
- R2 bucket for results snapshots: `slavicalliance-results-data`, with the public custom domain `data.slavicalliance.cz` and CORS allowing `https://slavicalliance.cz`

Configure Cloudflare bindings, variables, and secrets:

- `apps/site` Pages project (compatibility flag `nodejs_compat`):
  - R2 bindings `CONTENT_BUCKET` and `RESULTS_DATA_BUCKET`
  - secrets `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL` (read role), `DATABASE_URL_RW`, `GITHUB_DISPATCH_TOKEN`
  - optional variable or secret `DEPLOY_HOOK_URL`

GitHub repository secrets for `publish-results.yml`: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

## Deploy

Automatic production deploys run from GitHub Actions on every push to `main` and can also be started manually through `workflow_dispatch`.

Configure these repository secrets in GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare API token needs permission to deploy the Pages project. Runtime secrets such as `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` stay in Cloudflare.

Manual deploy:

```bash
npm run build:site
npm run deploy:site
```

## Open Items

Manual quiz results (`apps/admin` → "Historické výsledky"):
PR [#6](https://github.com/mareskav/slavicalliance-web/pull/6) is open but
not merged — still needs a real e2e run and manual smoke test against a
Postgres with the full schema, plus there's a prioritized list of admin UX
follow-ups (no save-success feedback, ad-hoc team rows not flagged in the
admin list, no submitted-by/updated-at display, ...). See "Status" and
"Next steps" in `docs/plans/manual-quiz-results.md`.

## Lessons Learned

Notes worth re-reading before touching similar code again, distilled from
real bugs/regressions hit in this repo:

- **Partial-update functions must distinguish `undefined` from `null`.** A
  DB update function that takes `Partial<T>` and writes every field through
  `coalesce($n, column)` cannot tell "field omitted" (leave unchanged) apart
  from "field explicitly set to `null`" (clear it). That silently breaks
  clearing an optional field back to empty during an edit. Build the `SET`
  clause dynamically instead — only include a column when its input value is
  `!== undefined`, and pass the real value (including `null`) straight
  through. See `packages/results-data/src/manual-results.ts`'s `updateManualResult`.
- **Any destructive one-click button needs a confirmation, even for an
  admin-only tool.** "Vymazat"/"Zrušit"-style buttons should never fire on a
  single click with no undo path — wrap them in `window.confirm(...)` (or an
  equivalent modal) that names what's being deleted.
- **Testing `window.confirm()` in Playwright**: Playwright auto-dismisses
  native dialogs unless you register a handler, so any e2e flow that expects
  a confirm-guarded action to actually go through needs
  `page.on("dialog", (dialog) => dialog.accept())` (or `.dismiss()` for a
  cancel-path test) before triggering it.
- **Mocking a module that itself does a dynamic `await import(...)` in a
  test file**: use `vi.hoisted()` to define the mock function before
  `vi.mock(...)` runs, then `await import("./module")` at the top level of
  the test file (after the `vi.mock` call) instead of a static `import`. A
  type-only symbol from that module still needs its own static
  `import type { Foo } from "./module"` — you can't destructure a type
  alongside runtime bindings out of a dynamic `import()` expression.
- **A form that lets a user switch what they're editing (e.g. clicking
  "Upravit" on a different row) needs a discard-confirmation guard** if
  another edit is already in progress — otherwise unsaved changes vanish
  with no warning.
- **Error messages tied to a specific action (edit/reject) should stay
  visible regardless of scroll position** — a message rendered only at the
  top of an unrelated form is easy to miss on a page with a long list below
  it. Prefer a sticky/fixed banner near the top of the viewport with a
  dismiss control.
