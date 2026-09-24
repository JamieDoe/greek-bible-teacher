# Greek Bible Teacher

A reading-first app for learning to read the Greek New Testament.

## Layout

```
apps/web         Next.js 16 front end (talks to the API over HTTP only)
apps/api         Hono REST API on Node
packages/shared  Pure domain logic + shared request/response schemas (Zod)
docs/            STATUS.md (where we are) and DECISIONS.md (why)
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
pnpm dev                # web on :3000, API on :8787
```

Check the API: `curl localhost:8787/health`.

## Scripts (run from the repo root)

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `pnpm dev`          | Web + API in watch mode                         |
| `pnpm typecheck`    | `tsc --noEmit` in every package                 |
| `pnpm lint`         | ESLint in every package                         |
| `pnpm test`         | Vitest in every package (API tests need the DB) |
| `pnpm format`       | Prettier write (`format:check` to verify only)  |
| `pnpm check`        | typecheck + lint + format:check + test          |
| `pnpm db:up / down` | Start / stop the Postgres container (data kept) |
| `pnpm db:generate`  | Generate a SQL migration from schema changes    |
| `pnpm db:migrate`   | Apply pending migrations                        |
