# Status

**Current phase:** 3 — Reader + token lookup ✅ complete (2026-09-24)

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
- **Phase 3:** the Reader at `/read/:id` shows John 1:1–5 from the DB, set in self-hosted Gentium.
  Every word is a button, and punctuation is displayed but not tappable. The bottom-sheet lookup
  panel has Simple, More and Full levels, and the level is remembered per user. It closes on Esc,
  a tap outside or a swipe down, and focus returns to the word with the scroll position unchanged.
  Other screens: `/read` (passage list) and `/about` (sources and licences, linked from the
  reader footer). Every data view has loading, error and empty or not-found states. There is a
  light paper theme and a dark theme. New API endpoints: `POST /session/anonymous` (httpOnly
  cookie), `PATCH /me/preferences`, `GET /passages`, `GET /passages/:id`, `GET /tokens/:id` and
  `GET /sources`. `pnpm seed` upserts curated passages.
- Tests: shared has 70, the API has 73 (including validation failures and happy paths for every
  slice endpoint against the test DB), and Playwright has 12 (6 on desktop and 6 on mobile: font
  and diacritics, tap → panel → Esc/outside/swipe, and remembered disclosure).

## Next

- **Phase 4 (Vocabulary + review):** SM-2-style scheduler in shared behind one interface,
  `POST /reading/:id/lookup` as a weak signal, `GET /review/queue`, `POST /review/:lemmaId`,
  the review UI (Greek → gloss, form in context → gloss, missed items resurface), Finish passage
  and Read again, and the bottom nav.

## Known issues / open questions

- **Dodson glosses verbs in the first person** ("I shine, appear, seem" for φαίνει). That is
  the lexicon's convention. Curated glosses for the slice words may read better in Phase 4/5.
- **Next streams not-found pages with HTTP 200** plus `noindex` under `loading.tsx`. This is
  documented Next behaviour.
- The MorphGNT morphology is CC BY-SA 3.0, with share-alike obligations for that data
  (DECISIONS 010). Attribution is shown on `/about` and in the reader footer.
- **530 lemmas (1.1% of tokens) have no gloss** (DECISIONS 011). The UI must handle this, and
  curated glosses can fill gaps.
- **CLAUDE.md appears truncated at the top:** it has no product, stack or layout section, and the
  Phase 6 "acceptance test" is never defined. The acceptance flow must be defined before Phase 6.
- The local machine runs Node 25, which is past end of life. It works, but Node 24 LTS is the target.
- ESLint 9 is EOL but still required by `eslint-config-next`'s plugins (DECISIONS 004).
