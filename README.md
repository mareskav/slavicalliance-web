# Slavic Alliance Web

Monorepo for the public Slavic Alliance website, quiz reservation overview, and quiz results app.

## Workspace

- `apps/site`: static Next export deployed to Cloudflare Pages. The public site includes the homepage, posts, `/kvizy`, and the Markdown admin editor. Runtime content APIs are Cloudflare Pages Functions backed by R2.
- `apps/results`: dynamic Next app deployed to Cloudflare Workers through `@opennextjs/cloudflare` under `/vysledky`. It serves team results, long-term league standings, and the quiz reservations API consumed by `/kvizy`.
- `packages/ui`: shared layout and UI components.

## Data Sources

- Site content lives as Markdown under `contents/pages/*` and `contents/posts/*`. In production, the Cloudflare Pages Functions read and write that content from the `CONTENT_BUCKET` R2 binding.
- Uploaded admin assets are stored in the same R2 bucket under `uploads/*` and are served through `/api/assets/*`.
- Quiz data comes from PostgreSQL:
  - `public.quiz_results` for team result history.
  - `public.quiz_leagues` for the long-term league window and metadata.
  - `public.quiz_pub_reservations` for upcoming pub quiz reservations.
  - `public.quiz_manual_results` for team result history entered manually by a captain through `/admin`, unioned into the read paths alongside `quiz_results`.

## Local Development

Create `.env.local` from `.env.example`, then run:

```bash
npm install
npm run dev
```

Local URLs:

- Site: `http://localhost:3000`
- Results: `http://localhost:3001/vysledky`
- Admin editor: `http://localhost:3000/admin`

The root `npm run dev` starts both apps. The site dev server proxies local content/admin APIs and handles `/vysledky/api/quiz-reservations` so the `/kvizy` page can use the same relative API path in development and production.

Useful single-app commands:

```bash
npm run dev:site
npm run dev:results
npm run build:site
npm run build:results
```

## Environment Variables

Use the root `.env.local` for normal monorepo development. App-level `.env.local` files still work when running a workspace directly.

- `DATABASE_URL`: PostgreSQL connection string for quiz results and reservations.
- `NEXT_PUBLIC_RESULTS_APP_URL`: canonical results app URL used by the site header/footer. Defaults locally to `http://localhost:3001/vysledky` and to `/vysledky` in production.
- `SITE_APP_URL` or `NEXT_PUBLIC_SITE_APP_URL`: canonical site URL used by the results app header. Defaults locally to `http://localhost:3000`.
- `CONTENT_SITE_URL`: optional source for production site builds to fetch live Markdown content from `/api/content/pages/landing`; defaults to `https://slavicalliance.cz` in production.
- `ADMIN_PASSWORD`: password for `/admin`.
- `CAPTAIN_PASSWORD`: optional password for the captain role in `/admin`, which can only add manual quiz results, not edit site content.
- `SESSION_SECRET`: HMAC secret for the admin session cookie.
- `DATABASE_URL_RW`: PostgreSQL connection string for the low-privilege `sa_web_rw` role used only by the manual-results write API (`insert`/`update` on `quiz_manual_results`, no access to the scraper-owned tables). See `docs/plans/captain-manual-quiz-results.md` and `apps/results/sql/`.
- `DEPLOY_HOOK_URL`: optional Cloudflare Pages deploy hook called after editing the landing page in admin.

## Cloudflare Setup

Create these Cloudflare resources:

- Pages project: `slavicalliance-site`
- Worker: `slavicalliance-results`
- R2 bucket for site content and uploads: `slavicalliance-site-content`
- R2 bucket for the OpenNext incremental cache: `slavicalliance-results-next-cache`

Configure Cloudflare bindings, variables, and secrets:

- `apps/site` Pages project:
  - R2 binding `CONTENT_BUCKET` to `slavicalliance-site-content`
  - secret `ADMIN_PASSWORD`
  - secret `CAPTAIN_PASSWORD`
  - secret `SESSION_SECRET`
  - optional variable or secret `DEPLOY_HOOK_URL`
- `apps/results` Worker:
  - secret `DATABASE_URL`
  - secret `DATABASE_URL_RW`
  - secret `SESSION_SECRET` (same value as the `apps/site` secret above — the two apps verify the same signed cookie)
  - variable `SITE_APP_URL` or `NEXT_PUBLIC_SITE_APP_URL`, for example `https://slavicalliance.cz`
  - route `slavicalliance.cz/vysledky*`
  - R2 binding `NEXT_INC_CACHE_R2_BUCKET` to `slavicalliance-results-next-cache`

## Deploy

Automatic production deploys run from GitHub Actions on every push to `main` and can also be started manually through `workflow_dispatch`.

Configure these repository secrets in GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare API token needs permission to deploy the Pages project and Worker. Runtime secrets such as `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` stay in Cloudflare.

Manual deploy:

```bash
npm run build:site
npm run deploy:site

npm run build:results
npm run deploy:results
```

For a Worker upload without publishing immediately:

```bash
npm run upload:results
```

On Windows, OpenNext may fail while creating symlinks during the Worker bundle step. Use WSL/Linux for `npm run deploy:results` if that happens.

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
  through. See `apps/results/src/lib/manual-results.ts`'s `updateManualResult`.
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
