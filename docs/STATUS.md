# Status

**Current phase:** 2 — Data ingestion ✅ complete (2026-09-24)

## Done

- **Phase 0:** pnpm workspace (`apps/web`, `apps/api`, `packages/shared`), strict TS, ESLint and
  Prettier, Docker Compose Postgres 18, Zod-validated env, CORS, shared error shape, blank web shell.
- **Phase 1:** Drizzle schema for the full data model (19 tables: text, lexicon, curriculum,
  learner). The first migration is `0000_init`. There is a DB client (postgres.js) and a
  `pnpm db:migrate` runner. Enum values come from `@gbt/shared`. See DECISIONS 007 for how the
  model differs from the CLAUDE.md sketch.
- `/health` pings the DB: it returns 200 `ok`, or 503 `degraded` when the DB is down.
- **Phase 2:** MorphGNT SBLGNT and the Dodson lexicon are pinned in `data/` with licence texts
  and a checksum lock. `pnpm data:fetch` and `pnpm ingest` are in place. The parse-code decoder
  and labels live in `@gbt/shared`. The full NT is imported: 27 books, 7,927 verses,
  137,554 tokens, 5,461 lemmas and 602 analyses. Frequencies are computed from the tokens.
  Glosses cover 98.9% of tokens. `data_sources` holds three sources with licence and attribution.
  Ingestion is idempotent (verified).
- Tests: 112 in total. Shared has 57 (decoder, every code value). The API has 55: env, health,
  CORS, schema constraints, line and XML parsing, the real pinned data (per-book counts, every
  analysis decodes, NFC, John 1:1 exact), and the DB import (lookups, frequency, ordinals,
  idempotency, curated glosses kept, sources).

## Next

- **Phase 3 (Reader + token lookup):** John 1:1–5 rendered from the DB, a tap panel with
  progressive disclosure, `GET /passages/:id` and `GET /tokens/:id`, the self-hosted Greek font,
  and the attribution footer and About/Sources screen.

## Known issues / open questions

- **Attribution is not yet shown in the app.** It is stored in `data_sources` and the About/Sources
  screen and reader footer come with Phase 3. The MorphGNT morphology is CC BY-SA 3.0, with
  share-alike obligations for that data (DECISIONS 010).
- **530 lemmas (1.1% of tokens) have no gloss** (DECISIONS 011). The UI must handle this, and
  curated glosses can fill gaps.
- **CLAUDE.md appears truncated at the top:** it has no product, stack or layout section, and the
  Phase 6 "acceptance test" is never defined. The acceptance flow must be defined before Phase 6.
- The local machine runs Node 25, which is past end of life. It works, but Node 24 LTS is the target.
- ESLint 9 is EOL but still required by `eslint-config-next`'s plugins (DECISIONS 004).
