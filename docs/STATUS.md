# Status

**Current phase:** 6 — Daily session ✅ complete (2026-09-24). **MVP acceptance test passes.**

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

- **Phase 4:** the SM-2 scheduler sits behind a `Scheduler` interface in shared, with the lookup
  nudge. Vocabulary selection (tiered, never random) and distractor and exercise logic are also
  pure functions in shared. New API endpoints: `GET /review/queue` (due words, then new words, or
  `?lemmaIds=`), `POST /review/:lemmaId`, `POST /reading/:id/lookup` (a weak signal) and
  `POST /reading/:id/complete`. The Review screen introduces new words, asks multiple-choice
  questions (the word alone or in its verse), grades Hard/Good/Easy, and brings missed words back
  in the same session. The Reader records lookups and has Finish passage (which offers a review
  of the words looked up) and Read again. The bottom nav has Today, Read and Review; Progress
  joins in Phase 7.
- Tests: shared has 106 (scheduler sequences on fixed dates, float4 round-trip, lookup nudge,
  vocabulary tiers, distractors, exercise choice). The API has 98 (queue composition, grading,
  in-session resurfacing, context exercises, lookups and nudges, completion, validation and 401
  paths). Playwright has 18: reader, finish → review looked-up words → a miss resurfaces, Read
  again, and a new learner's first review.

- **Phase 5:** 26 curated grammar concepts, ordered for reading John 1:1–5 first (DECISIONS 017).
  The slice concept is "The article and case: who is what". Each concept has real NT examples
  resolved to tokens, plus "Why this form?" rules; every word of John 1:1–5 is covered.
  `pnpm seed` loads passages and grammar. New endpoints: `GET /grammar`, `GET /grammar/:slug`,
  `GET /grammar/progress` and `POST /grammar/:slug/progress`. New pages: `/grammar` (list with
  studied marks) and `/grammar/:slug` (lesson, collapsible terminology, examples, Mark as
  studied, previous/next). Reader notes link to their lesson.
- Tests: shared 106, web 8 (Markdown subset), API 139 (content rules, seeding, note coverage and
  ranking, grammar endpoints and progress), Playwright 20.

- **Phase 6:**
  - Onboarding (`POST /me/onboarding`, `/onboarding`) and Today (`GET /today`, `/`).
  - The lesson stepper (`GET /lessons/:id`, `POST /lessons/:id/progress`, `/lesson/:id`),
    running review due → new words → grammar → read → look closer → recall → re-read. It is
    resumable.
  - A curated corpus of 10 passages with stored difficulty scores and required concepts, and 10
    lessons.
  - Curated glosses for the five slice words.
  - Migrations 0001 (`user_lesson_progress`) and 0002 (unique lesson per passage).
- Tests: shared 113, web 8, API 160, Playwright 22. The acceptance flow (docs/ACCEPTANCE.md) runs
  end to end on desktop and mobile.

## Next

- **Phase 7 (Progress):** the metrics screen. It shows words learned (a stable interval of at
  least N days), Greek words read, passages completed, concepts studied, review accuracy and
  reading activity over time. The Progress tab joins the bottom nav.

## Known issues / open questions

- **Dodson glosses verbs in the first person** ("I shine, appear, seem" for φαίνει). That is
  the lexicon's convention. Curated glosses for the slice words may read better in Phase 4/5.
- **Next streams not-found pages with HTTP 200** plus `noindex` under `loading.tsx`. This is
  documented Next behaviour.
- The MorphGNT morphology is CC BY-SA 3.0, with share-alike obligations for that data
  (DECISIONS 010). Attribution is shown on `/about` and in the reader footer.
- **530 lemmas (1.1% of tokens) have no gloss** (DECISIONS 011). The UI must handle this, and
  curated glosses can fill gaps.
- **CLAUDE.md appears truncated at the top:** it has no product, stack or layout section. The
  acceptance test was defined with you (docs/ACCEPTANCE.md).
- The grammar content is first-draft teaching prose. It is worth a review by someone who teaches
  Greek.
- The local machine runs Node 25, which is past end of life. It works, but Node 24 LTS is the target.
- ESLint 9 is EOL but still required by `eslint-config-next`'s plugins (DECISIONS 004).
