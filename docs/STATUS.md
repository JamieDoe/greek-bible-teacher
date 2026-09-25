# Status

**Current phase:** 9 — Deployment ✅ complete (2026-09-24). All MVP phases are done.
**MVP acceptance test passes**, including against the production stack.

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

- **Phase 7:**
  - `GET /progress` and the `/progress` screen, with a Progress tab in the bottom nav.
  - Metrics: words learned (interval ≥ 21 days) and in progress, Greek words read, passages
    completed, grammar studied, and review accuracy (with n of m, overall and for 7 days).
  - 28-day activity charts for words read and reviews, bucketed by the learner's time zone, with
    table views.
  - `reading_events` (migration 0003).
  - The acceptance test now also checks the Progress screen.
- Tests: shared 113, web 17, API 170, Playwright 22.

- **Phase 8:**
  - The app is installable: manifest, generated λ icons (including maskable) and iOS metadata.
  - A service worker caches the app shell, the last 20 pages visited and public reading data.
  - Recently read passages work offline, including the lookup panel. There is an offline page
    listing saved passages and an offline banner.
  - Larger tap targets for Greek words, safe-area viewport, and measured contrast in both themes.
- **Audio (requested after Phase 8):** hear a word from the reader sheet or a new-word card,
  and the whole passage from the reader (Listen/Stop). It uses the device's Greek voice through
  the Web Speech API and is labelled "Modern Greek voice", since lessons stay Erasmian
  (DECISIONS 021). Controls hide when the device has no Greek voice.
- Tests: shared 113, web 32, API 170, Playwright 30 (desktop, mobile, and a `pwa` project
  against a production build).

- **Koinē redesign:** the supplied design on shadcn/ui registry components, themed as a custom
  design system (DECISIONS 022).
  - Type is Literata, Geist and Geist Mono; the accent is lapis; light and dark follow the design.
  - Navigation is Home / Learn / Read / Progress (a sidebar on desktop), and there is a Settings
    screen (daily goal, name, Greek size, theme).
  - Welcome and a two-step onboarding. The name is kept on the device only.
  - Today has the four-stage session card, week dots, continue reading and due words.
  - Reader: the word sheet is a Drawer; words not yet known are marked; there is an Aa size
    control, a passage-complete screen with checkbox review, and "Add to review" in the sheet.
  - Review has new-word cards and an answer panel previewing the next interval.
  - Progress has a 14-week heatmap.
  - New API: `GET /lessons`, `GET /passages/:id/familiarity`, `POST /review/:lemmaId/add`,
    and richer `/today`, `/progress` and review queue responses.
- Tests: shared 113, web 30, API 182, Playwright 34. The acceptance flow (now via
  welcome → onboarding) passes on desktop and mobile, and the `pwa` project passes against a
  production build.

- **Phase 9 (Deployment):** see docs/DEPLOYMENT.md and DECISIONS 023.
  - Production images: the API (Node 24, tsx) and the web (Next standalone), both non-root with
    health checks.
  - `deploy/docker-compose.yml`: Postgres, a one-off `release` step (migrate, import, seed), the
    API, the web app and Caddy (automatic HTTPS, HSTS). Only Caddy is published.
  - Nginx alternative, `deploy/backup.sh` (`pg_dump` with 14-day retention), and restore and
    rollback steps.
  - `pnpm release` runs the same step locally. The web `start` script and the `pwa` e2e project
    use the standalone server.
- Verified locally with `DOMAIN=localhost`:
  - a fresh release took 18s, and a repeat 12s;
  - all 32 desktop and mobile e2e tests passed through Caddy over HTTPS;
  - a redeploy kept learner data;
  - a backup restored into a scratch database with matching counts.
- Tests: shared 113, web 30, API 182, Playwright 34.

- **After Phase 9:**
  - Per-IP API rate limits: 600 requests a minute and 60 new anonymous users an hour, with
    429 and `Retry-After`; on by default in production (DECISIONS 025).
  - GitHub Actions CI with check, e2e and Docker jobs (DECISIONS 026), dry-run in a clean Linux
    container.
- Tests: shared 113, web 30, API 189, Playwright 34.
- CI passed on GitHub on its first run (PR #1).

- **Recovery codes** (DECISIONS 027): make a code in Settings (shown once, only its hash is
  stored) and enter it at `/restore` (linked from Welcome) to carry progress to another browser
  or device. Failed attempts are rate-limited. Migration 0004.
- Tests: shared 120, web 30, API 198, Playwright 38.

## Next

The MVP is complete. Possible next steps, none started:

- Merge PR #1 into `main`.
- Deploy to a real VPS and take the first off-server backup.
- The AI phase (designed only, DECISIONS 024): `POST /ai/explain`, once auth exists.
- Prune anonymous users abandoned by a restore (no progress, no cookie in use), if they ever add
  up.
- The deferred design extras (DECISIONS 022): sense lines, declension chips, placement check,
  reminders.

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
