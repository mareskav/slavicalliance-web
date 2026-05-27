# Slavic Alliance Web

Monorepo for the public Slavic Alliance site and the quiz results app.

## Apps

- `apps/site`: static Next export deployed to Cloudflare Pages. Runtime content APIs are Cloudflare Pages Functions backed by R2.
- `apps/results`: dynamic Next app deployed to Cloudflare Workers through `@opennextjs/cloudflare` under `https://slavicalliance.cz/vysledky`.
- `packages/ui`: shared layout and UI components.

`/admin` exists in the codebase, but it is intentionally outside the current production deploy scope.

## Local Development

Create `.env.local` from `.env.example`, then run:

```bash
npm install
npm run dev
```

Local URLs:

- Site: `http://localhost:3000`
- Results: `http://localhost:3001/vysledky`

## Cloudflare Setup

Create these Cloudflare resources:

- Pages project: `slavicalliance-site`
- Worker: `slavicalliance-results`
- R2 bucket for site content: `slavicalliance-site-content`
- R2 bucket for Next incremental cache: `slavicalliance-results-next-cache`

Configure Cloudflare environment variables and secrets:

- `apps/site` Pages project:
  - R2 binding `CONTENT_BUCKET` to `slavicalliance-site-content`
- `apps/results` Worker:
  - secret `DATABASE_URL`
  - `NEXT_PUBLIC_SITE_APP_URL` or `SITE_APP_URL`, for example `https://slavicalliance.cz`
  - route `slavicalliance.cz/vysledky*`
  - R2 binding `NEXT_INC_CACHE_R2_BUCKET` to `slavicalliance-results-next-cache`

## Deploy

Automatic production deploys run from GitHub Actions on every push to `main`.
Configure these repository secrets in GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare API token needs permission to deploy the Pages project and Worker.
Runtime secrets such as `DATABASE_URL`, `SESSION_SECRET`, and `ADMIN_PASSWORD` stay in Cloudflare.

Manual deploy:

```bash
npm run build:site
npm run deploy:site

npm run build:results
npm run deploy:results
```

On Windows, OpenNext may fail while creating symlinks during the Worker bundle step. Use WSL/Linux for `npm run deploy:results` if that happens.
