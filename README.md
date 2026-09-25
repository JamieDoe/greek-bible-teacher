# Greek Bible Teacher

A reading-first app for learning to read the Greek New Testament.

## Layout

```
apps/web         Next.js 16 front end (talks to the API over HTTP only)
apps/api         Hono REST API on Node
packages/shared  Pure domain logic + shared request/response schemas (Zod)
data/            Pinned upstream data + licences (see data/README.md)
deploy/          Production Compose stack, Caddyfile, backup script (docs/DEPLOYMENT.md)
docs/            STATUS.md (where we are), DECISIONS.md (why), DEPLOYMENT.md (how to run it)
```

## Prerequisites

- Node.js 22.12+ (production target: Node 24 LTS)
- pnpm 12 (`corepack enable` picks up the version pinned in `package.json`)
- Docker (for Postgres)

## Getting started

```bash
cp .env.example .env    # then change POSTGRES_PASSWORD (and DATABASE_URL to match)
pnpm install
pnpm db:up              # Postgres 18 on 127.0.0.1:5432, waits until healthy
pnpm db:migrate         # apply migrations
pnpm ingest             # import the full NT + glosses from data/ (idempotent)
pnpm seed               # curated passages + grammar curriculum
pnpm dev                # web on :3000, API on :8787
```

Then open http://localhost:3000. Check the API: `curl localhost:8787/health`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs `pnpm check`, the Playwright suite against a
freshly imported database, and both Docker image builds on every pull request and push to
`main`.

## Deploying

One VPS with Docker Compose: Caddy (HTTPS) → Next standalone → Hono API → Postgres, with a
release step that migrates, imports and seeds on every deploy. See docs/DEPLOYMENT.md.

```bash
cp deploy/.env.example deploy/.env   # DOMAIN, ACME_EMAIL, POSTGRES_PASSWORD
docker compose -f deploy/docker-compose.yml up -d --build --wait
```

## Design system

The UI is shadcn/ui themed as the Koinē design system (docs/DECISIONS.md 022). Tokens live in
`apps/web/src/app/globals.css`, and the edited registry components in `apps/web/src/components/ui`.
To add a component, run `pnpm dlx shadcn@latest add <name>` from `apps/web`, then restyle it with
the tokens.

## Icons

`apps/web/scripts/generate-icons.mjs` re-renders the app icons with Literata (`node scripts/generate-icons.mjs` from `apps/web`).

## Scripts (run from the repo root)

| Script                | What it does                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`            | Web + API in watch mode                                                                                       |
| `pnpm typecheck`      | `tsc --noEmit` in every package                                                                               |
| `pnpm lint`           | ESLint in every package                                                                                       |
| `pnpm test`           | Vitest in every package (API tests need the DB)                                                               |
| `pnpm format`         | Prettier write (`format:check` to verify only)                                                                |
| `pnpm check`          | typecheck + lint + format:check + test                                                                        |
| `pnpm db:up / down`   | Start / stop the Postgres container (data kept)                                                               |
| `pnpm db:generate`    | Generate a SQL migration from schema changes                                                                  |
| `pnpm db:migrate`     | Apply pending migrations                                                                                      |
| `pnpm data:fetch`     | Re-download and verify the pinned files in data/                                                              |
| `pnpm ingest`         | Import the NT text, morphology and glosses                                                                    |
| `pnpm seed`           | Upsert curated passages, grammar and lessons                                                                  |
| `pnpm release`        | Migrate, import and seed in one go (what each production deploy runs)                                         |
| `pnpm audio:generate` | Pronunciation audio for the curated passages (dry run; `-- --yes` to spend; needs `ELEVENLABS_API_KEY`)       |
| `pnpm test:e2e`       | Playwright (needs DB ingested + seeded; reuses running servers; the `pwa` project builds and serves on :3100) |
