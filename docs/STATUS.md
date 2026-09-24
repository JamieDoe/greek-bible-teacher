# Status

**Current phase:** 1 — Schema + migrations ✅ complete (2026-09-24)

## Done

- **Phase 0:** pnpm workspace (`apps/web`, `apps/api`, `packages/shared`), strict TS, ESLint and
  Prettier, Docker Compose Postgres 18, Zod-validated env, CORS, shared error shape, blank web shell.
- **Phase 1:** Drizzle schema for the full data model (19 tables: text, lexicon, curriculum,
  learner). The first migration is `0000_init`. There is a DB client (postgres.js) and a
  `pnpm db:migrate` runner. Enum values come from `@gbt/shared`. See DECISIONS 007 for how the
  model differs from the CLAUDE.md sketch.
- `/health` pings the DB: it returns 200 `ok`, or 503 `degraded` when the DB is down.
- Tests: 18 in the API. They cover env parsing, health (DB up and down), 404 shape, CORS, and
  schema constraints against a freshly migrated test DB.

## Next

- **Phase 2 (ingestion):** pin MorphGNT SBLGNT and store the raw files and licences in `data/`;
  write the parse-code decoder in shared; import the full NT; compute lemma frequencies; import a
  gloss source; populate `data_sources`.

## Known issues / open questions

- **The SBLGNT text licence is the "SBLGNT EULA", not CC BY.** The MorphGNT README says the SBLGNT
  text is under the SBLGNT EULA and the MorphGNT analysis is under CC BY-SA 3.0. CLAUDE.md said CC BY.
  The EULA terms must be read and recorded in Phase 2 before any import.
- **The gloss source** is still to be chosen and its licence verified (Phase 2). Per CLAUDE.md, work
  stops to ask if none is usable.
- **CLAUDE.md appears truncated at the top:** it has no product, stack or layout section, and the
  Phase 6 "acceptance test" is never defined. The acceptance flow must be defined before Phase 6.
- The local machine runs Node 25, which is past end of life. It works, but Node 24 LTS is the target.
- ESLint 9 is EOL but still required by `eslint-config-next`'s plugins (DECISIONS 004).
