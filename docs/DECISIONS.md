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

**Consequences.** `/health` was liveness-only in Phase 0. Phase 1 made it DB-aware (see 009).

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

**Consequences.** Tests use a separate `_test` database on the same server (see 009). Production Compose comes in Phase 9.

## 006 — Web shell

**Decision.** Replace the scaffold page with a minimal shell. Remove Geist (`next/font/google`
downloads at build time and is not the reading font). Keep Tailwind v4 from the scaffold. Colours
are placeholder paper and dark tokens in `globals.css`.

**Consequences.** The self-hosted polytonic Greek font, with its licence checked, arrives with the
Reader (Phase 3). The full design pass happens in Phase 8.

## 007 — Data model refinements (Phase 1)

**Context.** CLAUDE.md sketches the data model and invites refinement. The schema is in
`apps/api/src/db/schema/`, and the first migration is `apps/api/drizzle/0000_init.sql`.

**Decision.** These changes from the sketch are deliberate:

- **Enums from `@gbt/shared`.** Morphology categories, POS, grades, lesson-item kinds, disclosure and
  experience levels are Postgres enums built from shared constant arrays, so the DB, decoder and API
  cannot drift apart. Values match the MorphGNT README. `vocative` is added (a real Greek case the
  README omits), and Phase 2 confirms which values actually occur.
- **`data_sources.key`** is a stable slug, so ingestion can upsert idempotently.
- **`verses.ordinal`** is a canonical NT-wide position, so a passage (start/end verse) becomes an
  ordinal range and doesn't rely on serial ids happening to be in order.
- **`books.canonical_order`**, and `curriculum_order` / `position` elsewhere, replace the column
  name `order` (a reserved word).
- **Join tables instead of id arrays:** `grammar_concept_examples` (concept → token) and
  `passage_required_concepts`. They are FK-checked. Phase 5 content will be authored as verse refs
  and resolved to token ids when it is seeded. Ingestion must therefore upsert tokens on
  `(verse_id, position)` and keep their ids stable, not truncate and reload.
- **`grammar_concept_rules.match`** is JSONB, typed and validated as a `MorphologyMatcher` (Zod,
  shared). A CHECK constraint enforces a non-empty object. `note` holds the curated "Why this form?"
  text.
- **`lesson_items`** has a CHECK so each kind points at exactly its own target (vocab → lemma,
  grammar → concept, reading → passage, review → none).
- **`users.disclosure_level`** (default `beginner`) and `onboarded_at` are added, because the reader's
  disclosure level is remembered per user.
- **`user_word_progress`** SRS fields are nullable until the first graded review. A row can exist
  earlier because reading lookups are recorded. Composite primary keys on (user, item) are used for
  all progress tables.
- **`lemmas_gloss_has_source`:** a gloss can't exist without `gloss_source_id`.
- **Deletes:** learner rows cascade when their user is deleted. Text and lexicon FKs block deletes.
- Identity columns (`generated by default as identity`), `timestamptz` everywhere, and `uuid` user
  ids from `gen_random_uuid()`.

**Consequences.** New tables that later screens need (for example a reading-activity log for
Progress) arrive as later migrations when that screen is built.

## 008 — DB driver and migrations

**Decision.** Use `drizzle-orm` 0.45 and `drizzle-kit` 0.31, the stable releases (1.0 is still in
RC), with the `postgres` (postgres.js) driver. `drizzle-kit generate` writes SQL migrations that are
committed in `apps/api/drizzle/`. They are applied by `runMigrations()` (`pnpm db:migrate`), which
is the same code tests and deploys use. `drizzle-kit push` is never used.

**Consequences.** Schema changes follow the flow: edit the schema, run `pnpm db:generate`, review
the SQL, then `pnpm db:migrate`.

## 009 — API tests run against a real, freshly migrated database

**Decision.** Vitest `globalSetup` drops and recreates `<DATABASE_URL db>_test` (or
`TEST_DATABASE_URL`), then applies all migrations. It refuses to touch any database whose name
doesn't end in `_test`. Test files run sequentially against that database. `/health` pings the
database through an injected `pingDb` and returns 503 `degraded` when it fails.

**Consequences.** `pnpm test` needs Postgres running (`pnpm db:up`). Every run also proves the
migrations apply to an empty database.

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
- `drizzle-orm`, `drizzle-kit`: ORM and migration generator (specified).
- `postgres`: Postgres driver for Drizzle. It needs no native build step and ships its own types.
