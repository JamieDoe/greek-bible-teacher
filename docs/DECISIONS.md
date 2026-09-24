# Decisions

Short ADR-style records: context → decision → consequences.

## 001 — Monorepo layout and inferred stack (Phase 0)

**Context.** CLAUDE.md names Hono, Zod, Drizzle, Postgres, Playwright, `packages/shared`, "web and
api", and a pnpm workspace. It has no explicit stack or layout section. The repo started as a
create-next-app scaffold at the root.

**Decision.** Use `apps/web` (the Next app, moved from the root), `apps/api` (Hono) and
`packages/shared`. Package scope is `@gbt/*`, linked with `workspace:*`. We will add no other packages without
a new entry here.

**Consequences.** Root scripts fan out with `pnpm -r`. Next.js docs are in
`apps/web/node_modules/next/dist/docs/`. `AGENTS.md` moved to `apps/web/` because `next dev`
re-creates it in the Next project directory if missing, and its relative docs path resolves from
there. Root `CLAUDE.md` now imports `@apps/web/AGENTS.md`.

## 002 — `packages/shared` ships TypeScript source, no build step

**Context.** Both apps consume shared code. A separate build/watch step for shared adds friction.

**Decision.** `@gbt/shared` exports `./src/index.ts` directly. Turbopack transpiles workspace
packages automatically (per the bundled `transpilePackages` doc), and the API runs through `tsx`.

**Consequences.** There's no `dist/` to keep in sync. The production API build (bundle vs `tsx`) is
decided in Phase 9.

## 003 — API runtime: Hono on Node via `@hono/node-server` v2 and `tsx`

**Context.** CLAUDE.md specifies Hono. It needs a Node adapter and a way to run TS in dev.

**Decision.** Use `serve({ fetch, port })` from `@hono/node-server` v2. `tsx watch` in dev. Env comes
from the root `.env` via Node's `--env-file-if-exists` and is validated by a Zod schema
(`apps/api/src/env.ts`) that fails with one message listing every bad variable. CORS allows exactly
`WEB_ORIGIN` with credentials, which the httpOnly session cookie will need. Every error response is
`{ error: { code, message, details? } }` (`@gbt/shared`).

**Consequences.** `/health` is liveness only for now. Phase 1 adds a DB readiness check with the DB
client.

## 004 — Tooling versions

**Context.** Several tools have newer majors whose ecosystem support is incomplete.

**Decision.**

- **ESLint 9, not 10.** `eslint-config-next` 16.3.6 depends on `eslint-plugin-react`,
  `-import` and `-jsx-a11y`, whose peer ranges stop at ESLint 9. One major across the repo is simpler.
  ESLint 9 is EOL, so revisit when those plugins support 10.
- **TypeScript 5.9.** `typescript-eslint` 8.70 requires `<6.1`, and TS 7 is not supported by it.
- **Vitest 4, not 5.** Vitest 5's `engines` exclude Node 25, which the dev machine runs. Vitest 4
  supports Node 20/22/24+.
- **Node ≥ 22.12** (engines). Node 24 LTS is the production target.
- **Prettier** for formatting. No stylistic ESLint rules, so no bridge config is needed.
- `pnpm-workspace.yaml` `allowBuilds: esbuild: false`. The platform binary is installed from
  optional deps, so its postinstall isn't needed.

**Consequences.** Revisit ESLint 10 and TS 6+/7 when the Next/typescript-eslint peers allow them.

## 005 — Local Postgres via Docker Compose

**Decision.** `postgres:18-alpine`, published on `127.0.0.1` only, with a `pg_isready` healthcheck
(`pnpm db:up` waits for it). The named volume is mounted at `/var/lib/postgresql`, the data layout
for Postgres 18+ images (`PGDATA=/var/lib/postgresql/18/docker`). `POSTGRES_PASSWORD` has no
default, so Compose refuses to start without `.env`.

**Consequences.** A test database is added when API tests first need one. Production Compose comes in Phase 9.

## 006 — Web shell

**Decision.** Replace the scaffold page with a minimal shell. Remove Geist (`next/font/google`
downloads at build time and is not the reading font). Keep Tailwind v4 from the scaffold. Colours
are placeholder paper and dark tokens in `globals.css`.

**Consequences.** The self-hosted polytonic Greek font, with its licence checked, arrives with the
Reader (Phase 3). The full design pass happens in Phase 8.

## Dependencies

One line each, for why the dependency exists.

- `hono`: API framework (specified).
- `@hono/node-server`: runs Hono on Node's HTTP server.
- `zod`: runtime validation for env, requests and shared response schemas (specified).
- `tsx`: runs the TS API in dev and watch mode without a build step.
- `vitest`: unit and API tests. It runs TS natively and Hono's `app.request()` makes route tests cheap.
- `prettier`: formatting.
- `typescript-eslint`, `@eslint/js`: lint rules for the non-Next packages.
- `@types/node` (^22): Node types matching the minimum supported runtime.
