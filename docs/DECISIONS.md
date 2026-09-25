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
- **`grammar_concept_rules.match`** is JSONB, typed and validated as a `TokenMatcher` (Zod,
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

## 010 — Text and morphology source: MorphGNT SBLGNT, licences as verified

**Context.** CLAUDE.md said SBLGNT is reported as CC BY and asked for verification.

**Decision.** Import MorphGNT `sblgnt` pinned at commit `aaed91e` (tag 6.12 plus later
corrections). Licences, per `data/README.md`:

- **SBLGNT text:** CC BY 4.0. sblgnt.com/license serves the full CC BY 4.0 text, although the
  MorphGNT README still calls it the "SBLGNT EULA".
- **MorphGNT parsing and lemmas:** CC BY-SA 3.0.

Both are stored in `data_sources` (`sblgnt`, `morphgnt-sblgnt`). Tokens point to
`morphgnt-sblgnt`, the dataset actually imported.

**Consequences.** The app must show both attributions (the About/Sources screen and the reader
footer arrive with the Reader, Phase 3). The morphology the app serves is adapted CC BY-SA
material. That data must stay under CC BY-SA and stay attributed, and no terms that restrict it
may be added. This does not affect the licence of the app's own code. It is our reading, not legal
advice.

## 011 — Gloss source: Dodson (public domain)

**Context.** CLAUDE.md required an openly licensed, lemma-keyed English gloss source.

**Decision.** Use Dodson's Greek-English Lexicon, biblicalhumanities edition, commit `74f7035`.
Dodson released it into the public domain, and the repo is CC0 1.0. The TEI XML has Unicode
headwords. It is matched to MorphGNT lemmas (NFC) by an exact match, then two spelling-only
fallbacks: bracketed optional letters (`οὕτω(ς)`) and diaeresis-insensitive matching when it is
unambiguous. Headwords that appear twice are genuine homographs (βάτος, μήν, ἄπειμι), and their
senses are joined. Coverage is 4,931 of 5,461 lemmas, or **98.9% of NT tokens**.

**Alternatives.** STEPBible TBESG (CC BY 4.0) is keyed by extended Strong's numbers, so it would
need a Strong's mapping MorphGNT doesn't provide. Abbott-Smith's TEI is public domain but gives
full entries, not glosses.

**Consequences.** 530 lemmas (1.1% of tokens) have no gloss. They are mostly lemma-form
differences such as `Μωϋσῆς`/`Μωσῆς`, `Ἰερουσαλήμ`/`Ἱερουσαλήμ`, `τεσσεράκοντα`/`τεσσαράκοντα`,
`Καφαρναούμ`/`Καπερναούμ`, and middle-only verbs such as `προσκαλέομαι`. They are not guessed.
The UI must handle a missing gloss. Hand-curated glosses (`source='curated'`) can fill gaps and
are never overwritten by re-imports.

## 012 — Ingestion design

**Decision.** `pnpm ingest` runs `loadSources()`, which verifies checksums and parses every file
strictly, failing with `file:line` on any malformed line or unknown code. `importNt()` then writes
everything in **one transaction**. Every write is an upsert on a natural key (source key, book
abbrev, chapter, verse ref, (pos, parse), lemma, (verse, position)), so re-runs are no-ops and
keep row ids stable. Grammar examples can therefore reference token ids (see 007). Lemma
`nt_frequency` and `part_of_speech` (the most common POS of the lemma's tokens) are computed in
SQL from the imported tokens. After import, per-book token counts in the database must equal the
parsed counts, and frequencies must sum to the token total, or the transaction rolls back. All
Greek fields are NFC-normalised. The pinned files are already NFC, so surface text is stored
byte-for-byte as published.

**Consequences.** Re-running on the same pin was verified identical: the table fingerprints and
max ids are unchanged. The import runs `ANALYZE` on the freshly loaded tables inside its
transaction, and aggregates tokens per lemma before updating frequencies. Without this, the
planner had no statistics on a freshly truncated database and chose a nested-loop plan that ran
for over 10 minutes. That was the cause of an earlier flaky test. Test DB connections now set a
30s `statement_timeout`, so a bad plan fails fast instead of hanging the suite. If a future pin removes tokens or verses, the leftover rows make the count
validation fail loudly instead of lingering silently. The full NT imports in about 10–20s.

## 013 — Web ↔ API: same-origin via a Next rewrite; anonymous session cookie

**Context.** The web app may only reach data over HTTP. The anonymous user id must live in an
httpOnly cookie and not in JS state.

**Decision.** The browser calls `/api/*` on the web origin, and a Next rewrite proxies to
`API_INTERNAL_URL`. That makes the cookie first-party, so it needs no cross-site cookie setup.
Server Components fetch public data (passages, sources) directly from `API_INTERNAL_URL`.
`POST /session/anonymous` creates the `users` row or returns the existing one. It sets
`gbt_uid` (httpOnly, SameSite=Lax, Secure in production, 400 days). The id is never included in
response bodies. The cookie value is the random v4 uuid, unsigned. It carries no sensitive data
and is unguessable, and signing can be added when auth arrives. API CORS stays explicit (only
`WEB_ORIGIN`) for direct calls. Input validation uses Zod through small helpers
(`http/validate.ts`). `@hono/zod-validator` would add a dependency for about 20 lines of code.

**Consequences.** Next resolves rewrites at build time, so Phase 9 must set `API_INTERNAL_URL`
at `next build`. `PATCH /me/preferences` was added because the reader must remember the
disclosure level per user.

## 014 — Reader choices (Phase 3)

_Typeface and lookup panel superseded by 022 (Literata; a vaul Drawer)._

- **Typeface:** Gentium 7.000 (SIL OFL 1.1), self-hosted with `next/font/local`, using the
  unmodified Regular and SemiBold WOFF2 files (about 720 KB). The OFL's Reserved Font Name
  "Gentium" means subsetting would require renaming, so the files aren't subset. SBL Greek was not
  chosen because Gentium's licence is clear and it has full polytonic coverage. A Playwright test
  checks that the font loads and that decomposed (NFD) and precomposed text render at the same
  width, which shows combining marks are positioned rather than advanced.
- **Punctuation vs. tap targets:** the API splits each token's surface into
  `before` / `word` / `after` (`splitSurface`, shared). Only the word is a button, and the
  punctuation and verse number sit in the same no-wrap span so they never break away from it.
  **SBLGNT apparatus sigla (⸀ ⸁ ⸂ ⸃ ⸄ ⸅) are hidden in the reader**, because without the
  apparatus they mean nothing to learners. The raw `surface` is unchanged in the DB and the token
  detail. A test on the full NT confirms nothing else is dropped.
- **Lookup panel:** a native modal `<dialog>` as a bottom sheet. It handles focus, Esc and the
  inert background. Tapping the backdrop or swiping the handle down more than 80px also closes it.
  Focus returns to the word with `preventScroll` after the dialog closes, and page scroll is
  locked while it is open, so the reading position doesn't move. Beginner and Expanded render
  immediately from the passage payload. Advanced detail (frequency, same-form count, extended
  gloss, nearby occurrences: same book first, then nearest) and the "Why this form?" notes come
  from `GET /tokens/:id`. Notes appear only when curated `grammar_concept_rules` match (JSONB
  containment against the token's morphology). None exist until Phase 5.
- **Deferred to Phase 4:** "Finish passage" (reading progress plus a review of the words looked
  up) and "Read again". Both depend on lookup recording and the review queue. The bottom nav also
  waits until a second top-level screen (Review) exists, so it has no dead links.

## 015 — Spaced repetition: SM-2 behind a `Scheduler` interface

**Decision.** `@gbt/shared/srs` defines `Scheduler { review(prev, grade, now); nudgeForLookup(state, now) }`
and implements `sm2Scheduler`. The API imports it in exactly two places: grading and lookups.

- **Grades:** again (lapse: interval 0, due in 10 min, ease −0.2); first success hard/good →
  1 day, easy → 4 days; then good → 6 days, then interval × ease; hard → × 1.2; easy →
  good × 1.3. Intervals never shrink on success and are capped at 365 days. Ease is kept
  between 1.3 and 3.0 and starts at 2.5.
- **Column meanings:** these stay fixed so FSRS can reuse the rows. `difficulty` is 0–1 (the
  SM-2 ease mapped so higher is harder). `stability` is days (for SM-2, the interval).
  `interval_days` and `next_review_at` are as named. Ease is rounded to 2 dp when decoded, so
  float4 storage never drifts; a test covers this.
- **Lookup signal:** a lookup only moves `next_review_at` earlier: it halves the time left,
  with a floor of an hour from now. A word already due is untouched. Interval, difficulty and
  counts are unchanged, so a lookup is weaker than a lapse by construction. Unscheduled words
  just count lookups, which feed the "struggling" tier of vocabulary selection.
- **Counts:** "again" adds to `incorrect_count`, every other grade to `correct_count`. Every
  grade is appended to `review_events` in the same transaction.

**Consequences.** All scheduler tests use fixed dates. The API takes an injected clock and RNG
(`AppDeps.now`, `AppDeps.rng`), so route tests are deterministic too.

## 016 — Review session and vocabulary selection

- **Queue (`GET /review/queue`):** due words, oldest first, then new words to fill the session.
  The session holds at most 20 items and at most 5 new words. `?lemmaIds=` reviews exactly the
  given words; this is offered after finishing a passage for the words looked up. The reader
  tracks those words client-side for the current read-through, so no extra log table is needed.
- **New words:** `selectNewVocabulary` (shared, pure, never random) ranks candidates in tiers:
  1. words in the current passage (the first curated passage not yet completed);
  2. the top 100 lemmas by NT frequency;
  3. struggling words: looked up twice or more, or missed at least as often as recalled;
  4. stage-appropriate words: frequency rank ≤ max(200, 100 + 2 × known).

  Within a tier the order is NT frequency, then id. Scheduled or unglossed words are never new.
  "Known" means an interval of at least one day.

- **Exercises:** recognition only, as four-option multiple choice. A word is asked on its own
  (Greek → gloss) until it is recalled once. After that it alternates with the form in its
  verse, which comes from the first curated passage containing it, or else its first NT
  occurrence. Distractors are the same part of speech and nearest in frequency (log scale), with
  duplicate glosses removed and a seeded or random pick from the nearest 12. Lemmas whose part of
  speech has too few members, such as the article, top up from any part of speech.
- **Grading:** a correct answer offers Hard, Good or Easy. A wrong answer shows the answer and
  grades "again", and the word comes back three cards later in the same session. Each attempt is
  posted, so a relearned word restarts at one day.

**Consequences.** Phase 6's daily lesson reuses the queue and selector for its "review due" and
"new vocabulary" steps.

## 017 — Grammar curriculum: order, format and linking

**Order (26 concepts).** Concepts are ordered by what the reading needs, starting with
John 1:1–5, then the next passages:

1. Alphabet, then breathings and accents.
2. **The article and case: who is what.** This is the slice concept. It merges the suggested
   "article", "case shows role" and "nominative & accusative", because John 1:1 teaches them
   together (ὁ λόγος vs τὸν θεόν, and θεὸς ἦν ὁ λόγος).
3. John 1:1–5's most frequent needs, in order: εἰμί (ἦν ×5); connectors (καί ×7); prepositions
   (ἐν, πρός, διά, χωρίς); dative (ἀρχῇ, αὐτῷ, σκοτίᾳ); genitive (αὐτοῦ, ἀνθρώπων); gender and
   number; personal pronouns and demonstratives (αὐτός, οὗτος); negation (οὐ, οὐδέ).
4. Verbs in the order John 1:1–5 shows them: aorist (ἐγένετο, κατέλαβεν), present (φαίνει),
   imperfect, perfect (γέγονεν), middle/passive (ἐγένετο), then relative pronouns (ὅ) and
   adjectives (πάντα).
5. Forms that the following passages need: future, infinitive, participles (two concepts),
   subjunctive, imperative, word order.

A test checks that every token in John 1:1–5 gets at least one curated note.

**Format.** Each concept is a typed TS module in `apps/api/src/content/grammar/`. This is
hand-written project content, not imported data. The body is Markdown with a fixed shape:
simple explanation, then "Why it matters for reading", then "Going deeper" for terminology.
Examples are written as verse ref plus word and resolved to token ids at seed time.
`pnpm seed` fails loudly if a word isn't in the verse, a matcher is invalid, or the DB holds
concepts the content has dropped. Re-seeding upserts by slug and replaces rules and examples,
so ids stay stable.

**Linking.** `TokenMatcher` (formerly `MorphologyMatcher`) gains an optional `lemma`, so
concepts like εἰμί, the connectors and negation can match by word. A rule matches by JSONB
containment against the token's lemma and morphology. "Why this form?" shows each matched
concept once, ranked: rules naming the lemma first, then more features, then curriculum order.
The reader shows the top two, each linked to its lesson. Notes are only ever curated rule text.

**Rendering.** The web app renders a tiny Markdown subset itself (headings, paragraphs, lists,
bold, italic; no HTML). It wraps Greek runs in `lang="grc"` automatically. Its parser is
unit-tested (web now has Vitest for pure helpers). A Markdown library would add a dependency and
still need a plugin for the Greek language tagging.

**Progress.** Opening a lesson records `introduced`; "Mark as studied" records `studied` with
its first date. Status never moves backwards. "Going deeper" is collapsed for Simple readers and
open for More or Full.

## 018 — Daily session: corpus, lessons, steps and Today

- **Corpus (10 passages).** John 1:1–5, then nine passages chosen from 20 scored candidates.
  Scoring used `passageDifficulty` (shared, pure): average log-frequency rank 35%, share of
  tokens outside the top 300 lemmas 35%, verse length 15%, and grammar concepts not yet covered
  15%. The order is roughly easiest first, with judgement: the prologue (John 1:6–9, 1:10–13)
  stays together while its vocabulary is fresh, and Johannine and Markan passages alternate.
  Stored scores are computed at seed time and include the concepts each passage needs beyond its
  lesson's point in the curriculum.
- **Lessons.** There is one lesson per passage, keyed by passage (a unique constraint, migration
  0002), and each teaches one concept in curriculum order. Lesson 1 uses the specified slice
  vocabulary. Later lessons take the passage's five most frequent glossed lemmas not taught in
  earlier lessons, skipping the article (grammar covers it). This is deterministic, never random.
  The five slice words get **curated glosses** (source `curated`), because Dodson lists senses
  like "ruler" before "beginning". Dodson's fuller entry stays as the extended gloss.
- **Steps.** `lesson_items` stores review, vocab ×5, grammar, reading, review and reading. The
  API derives the daily loop from them:
  1. review due (due words only, `mode=due`);
  2. new vocabulary (every word introduced first);
  3. grammar;
  4. guided reading;
  5. look closer (passage tokens matching the lesson concept's rules, with notes);
  6. recall (the new words plus the words looked up during reading);
  7. re-read.

  Grades in lessons are logged with `context = lesson`. The reading steps reuse the Reader, and
  finishing records reading progress.

- **`user_lesson_progress`** (migration 0001, beyond the original sketch) stores the current step,
  so a lesson resumes after a reload, and the completion date. Completion is never undone. The
  words looked up are kept client-side only. After a reload mid-lesson, recall covers the
  lesson's vocabulary alone.
- **Today (`GET /today`)** shows the first incomplete lesson, the most recent completion (for "done
  today"), the due count, the lesson's concept and passage, and counts: words in review, passages
  completed, concepts studied and lessons done. Learners who aren't onboarded are redirected to
  `/onboarding`. That page asks for experience and daily minutes (5–30), and stores nothing
  personal. Daily minutes are shown on Today but don't yet change the lesson.
- **Acceptance test:** defined in `docs/ACCEPTANCE.md` and automated in Playwright.

## 019 — Progress metrics

_The two column charts were replaced by a 14-week heatmap in 022._

**Decision.** `GET /progress?tz=<IANA>&days=7–90` returns real counts only; there is no
proficiency percentage.

- **Words learned** means an SRS interval of at least 21 days (`LEARNED_INTERVAL_DAYS`,
  shared), a common "mature card" threshold. Words below it that are scheduled count as "in
  progress".
- **Greek words read** is the sum of tokens over finished read-throughs, re-reads included.
- **Other counts:** passages completed (distinct), and concepts marked studied.
- **Review accuracy** is the share of grades other than "again", overall and for the last 7
  days. It is always shown with its raw "n of m".
- **Activity over time** is words read and reviews per local day, zero-filled. Days are
  bucketed in the learner's IANA time zone, which the client sends and the API validates. This
  needed an append-only **`reading_events`** log (migration 0003), written in the same
  transaction as `POST /reading/:id/complete`. `user_reading_progress` only keeps the first and
  last dates. There are no users yet, so nothing is backfilled.
- **Chart:** two single-series daily column charts rather than one chart with two y-axes,
  because the two measures differ in scale by about 10×. Each has one warm hue (`--chart`),
  checked with the dataviz palette validator on each mode's surface. The UI accent failed the
  chroma floor, so charts use their own token. Bars are at most 24px thick with 4px rounded
  tops, hairline grid, whole-number ticks, and a hover or focus tooltip over a full-column hit
  target. Each chart has a table view. It is drawn at the container's real width, so labels
  stay at true pixel sizes on phones.

## 020 — PWA: manifest, icons and a hand-written service worker

_Icons are now set in Literata, lapis on ground (022)._

- **Manifest** via Next's `app/manifest.ts` convention: standalone display, paper
  background and theme colours, and 192/512 icons plus a 512 maskable icon. `app/icon.png` and
  `app/apple-icon.png` use Next's metadata conventions. iOS gets `appleWebApp` metadata and
  `viewport-fit=cover`; the nav and sheet already pad with `env(safe-area-inset-*)`.
- **Icons** are λ (as in λόγος) in the accent on paper, set in the self-hosted Gentium. They are
  generated by `apps/web/scripts/generate-icons.mjs`, which renders HTML in Playwright's
  Chromium, so there is no image tooling dependency and they are reproducible. The maskable icon
  keeps the glyph inside the 80% safe zone.
- **Service worker (`public/sw.js`, about 120 lines, no library).** The Next guide's suggestion
  (Serwist) would add a dependency and a build plugin, for what here is four caching rules:
  1. navigations are network-first into a 20-entry page cache, falling back to `/offline`;
  2. `/_next/static` is cache-first (hashed, immutable);
  3. public reading data (`/api/passages`, `/api/tokens`, `/api/grammar`, `/api/sources`) is
     network-first into a 300-entry cache;
  4. RSC payloads and all user-specific API calls are never cached.

  On install it precaches `/offline` and the build assets that page references (read from its
  HTML), so the offline page hydrates and lists saved passages with nothing else cached. The
  Reader posts `cache-page` to the worker, because opening a passage by tapping a link fetches
  an RSC payload rather than HTML. The worker only registers in production builds, so dev and
  Turbopack HMR are untouched. `sw.js` is served `no-cache` with a same-origin CSP.

- **Offline behaviour:** recently read passages open and their inline gloss/morphology panel
  works; token details that were looked up online are also cached. Mutations (lookups,
  finishing) fail quietly or with the existing error states. A banner shows while offline.
- **Tests:** a Playwright `pwa` project runs against a production build on :3100 (since 023, the
  standalone server). It
  checks the manifest, icons and `sw.js` headers, then reads a passage online, goes offline,
  reloads it, looks up a word, and hits the offline fallback's saved list.
- **Polish:** Greek word buttons get a larger invisible tap area (a pseudo-element, so layout is
  unchanged). All text/surface pairs were measured: WCAG contrast is at least 5.3:1 in both
  themes. `color-scheme: light dark` is declared. The theme follows the system setting; there is
  no manual toggle in the MVP.

## 021 — Pronunciation audio: the device's Greek voice, labelled as Modern Greek

**Context.** The user asked for audio so learners can hear words. The options were the
device's voice (Web Speech API), recorded human audio, or a cloud TTS service. Device and cloud
voices speak Modern Greek, while lessons teach Erasmian.

**Decision (chosen by the user).** Use the browser's Web Speech API with the device's Greek
voice. Lessons stay Erasmian, and the audio is labelled "Modern Greek voice" everywhere. The
alphabet lesson explains the differences.

- `lib/speech.ts` is pure and unit-tested. It picks the best Greek voice (el-GR first, then
  on-device, then default). It converts polytonic text to the monotonic spelling Greek voices
  expect: breathings, iota subscripts, length marks and apparatus sigla are dropped; grave and
  circumflex become the stress accent; diaeresis and punctuation are kept.
- Speaker buttons (44×44) sit on the reader's word sheet and on new-word cards. The reader
  header has Listen/Stop for the whole passage. Speech runs at rate 0.8. All audio controls hide
  themselves when the device has no Greek voice. There are no new dependencies, no data
  licensing, and it works offline where the voice is on the device.

**Consequences.** Pronunciation quality and availability vary by device. The design's
Erasmian / Restored Koine setting can't be honoured by device voices; see the design notes.
Playwright stubs the speech engine, since headless Chromium has no Greek voice.

## 022 — Koinē redesign on shadcn/ui

**Context.** The user supplied the design "Koinē — Greek NT learning PWA" (18 pages, with a
design-system page) and asked for shadcn/ui, themed as a custom design system, with registry
components used wherever one fits (checkboxes, cards, and so on).

**Decision.** shadcn/ui (radix base, nova preset) is initialised in `apps/web`. The registry
components live in `components/ui` and are edited in place to become the Koinē system, rather
than wrapped.

- **Tokens.** Koinē's colours map onto shadcn's variables in `globals.css`:
  - ground → `background`; surface → `card`/`popover`; sunken → `muted`/`secondary`.
  - line → `border`/`input`; ink → `foreground`; muted ink → `muted-foreground`.
  - lapis → `primary`/`ring`; lapis soft → `accent`.
  - Custom additions: `rubric` (new or wrong), `correct`, and their soft tints (via `color-mix`).
  - Dark mode is its own palette from the design, not an inversion.
- **Theme and text size** are set before paint. A small inline script reads `koine-theme` and
  `koine-greek-size` from localStorage, adds `.dark`, and sets `--greek-size`. Both are device
  preferences in Settings, and the reader has an "Aa" control.
- **Type.** Literata (text and Greek: latin, greek and greek-ext subsets, with an optical-size
  axis), Geist (UI) and Geist Mono (labels). All three are SIL OFL 1.1 and self-hosted by
  `next/font/google` at build time; the licences were checked on Google Fonts and upstream.
  Gentium is removed. The font test now checks that no Greek glyph falls back, rather than
  comparing NFD and NFC widths, because Literata's precomposed glyphs are spaced on purpose.
- **Components changed from the registry defaults:**
  - Button: 56/48/44px sizes, an `ink` variant, and a rubric `destructive`.
  - Card: 24px radius and a soft shadow; a ring instead in dark mode.
  - Badge: `parsing` (mono chip) and `greek` variants.
  - Toggle group: a `segmented` variant, used for disclosure level, daily time, ease and theme.
  - Checkbox and radio are 24px.
  - Drawer: the reader's word sheet, with swipe-down, Esc and tap-outside built in.
  - Slider: the name moves to the focusable thumb, which has a 44px hit area.
  - Also used: Progress, Input and Label.
- **Screen changes.**
  - Navigation is Home / Learn / Read / Progress (a sidebar on desktop); Learn gathers
    lessons, review and grammar. Lesson, review, reader, onboarding and welcome are immersive
    (no nav).
  - The 7-step daily loop is unchanged, grouped into 4 stages (α′ review, β′ new words,
    γ′ grammar, δ′ read) on Today and in the lesson header (`lib/stages.ts`, tested).
  - In the reader, words not yet in review have a dotted rubric underline
    (`GET /passages/:id/familiarity`).
  - Passage complete lists the words looked up with checkboxes. Ticked words go into review
    (`POST /review/:lemmaId/add`, which never reschedules a word already in review).
  - The review answer panel previews the next interval with the same SM-2 scheduler, and
    Hard/Good/Easy is one segmented control plus Continue.
  - Progress shows a 14-week heatmap: one hue, an opacity ramp, and a table view.
  - `GET /today` gains week dots, days practised, known words in the passage and due words.
    It takes a validated IANA `tz`.
- **Personal data.** The optional first name is stored only in localStorage and never sent
  to the API (chosen by the user), in line with "no sensitive data until auth".

**Deferred or not taken.**

- Not taken from the design: transliteration, sense lines, declension and forms chips, the
  placement check, reminders, and Restored Koine pronunciation (device voices can't do it; 021).
- The grading step keeps Hard/Good/Easy (CLAUDE.md), compacted, instead of the design's single
  button.
- The `/review?lemmas=` route was removed: nothing links to it now that looked-up words go
  into review from the completion screen.

**Consequences.** UI code reads as standard shadcn, so new screens start from the registry. The
Koinē look lives in the tokens plus about ten edited component files. Registry updates must be
merged by hand into those files: check `git diff` after any `shadcn add --overwrite`.

## 023 — Deployment: Docker Compose on one VPS, Caddy, release step

**Context.** Phase 9 needs production images, Compose for a VPS, a reverse proxy,
migration-on-deploy and a backup story. It is one server, one instance of each service.

**Decision.**

- **API image** (`apps/api/Dockerfile`, Node 24 LTS alpine): a production-only filtered
  `pnpm install`, then the TypeScript source run with `node --import tsx`. `tsx` moves from dev
  to runtime dependencies.
  - Why not compile? A `tsc` build would need `.js` import specifiers across the API and shared.
  - Why not bundle? Bundling breaks the `import.meta.url` paths to `drizzle/` and `data/`.
  - Why not Node's type stripping? It can't resolve extensionless imports.
  - The cost is a one-off transform at start-up (under a second). The repo layout is kept in
    the image, so those paths resolve unchanged.
- **Release step** (`src/scripts/release.ts`): a one-off Compose service that runs migrations, the
  NT import and the content seed on every deploy. The API starts only after it succeeds
  (`service_completed_successfully`).
  - It re-imports every time (about 12s) rather than tracking what changed. The import is
    already idempotent and transactional, and the database then always matches the pinned
    data and curated content in the image.
- **Web image** (`apps/web/Dockerfile`): `output: "standalone"`, traced from the monorepo root
  (`outputFileTracingRoot`) so `@gbt/shared` is included. It runs as a non-root user with a
  health check.
  - `API_INTERNAL_URL` is a build argument, because the rewrite is fixed at build time. It is
    also a runtime variable, for Server Components.
  - The `start` script and the `pwa` e2e project now run this same standalone server, since
    `next start` doesn't support standalone output.
- **Caddy** (`caddy:2-alpine`) is the only published service. It gives automatic HTTPS, the
  HTTP→HTTPS redirect and HSTS with a ten-line Caddyfile. It flushes streamed responses of
  unknown length by default, so Next streaming works.
  - Nginx notes are in docs/DEPLOYMENT.md, for servers that already run it.
  - The API is reachable only through Next's `/api/*` rewrite, which keeps the session cookie
    first-party.
- **Backups:** `deploy/backup.sh` runs `pg_dump` (custom format) with 14-day retention via cron.
  Restore steps and a restore drill are documented.
- The prod Compose project is named `greek-bible-teacher-prod`, so it can't collide with the dev
  database's project on a developer machine.

**Consequences.** One command deploys (`up -d --build --wait`); the images are built on the
server, so it needs about 2 GB RAM. Migrations run while the old API still serves, so they must
be backward compatible (expand, then contract). Rolling back code does not roll back the schema;
the pre-deploy backup covers that. A single instance: Next's file cache and in-memory state are
fine as they are. Verified locally: the full stack behind Caddy (DOMAIN=localhost) passed all 32
desktop and mobile e2e tests, a redeploy kept learner data, and a backup restored with matching
counts.

## 024 — AI explanations (Phase 2): design only, not implemented

**Context.** CLAUDE.md asks for a design, without code, of a future endpoint where a model
explains a Greek sentence to the learner. The risk is a model that confidently misparses Greek.
The app already has authoritative data for every token, so the model's job is to explain it, not
to analyse the Greek.

**Decision (future work).**

- **Endpoint.** `POST /ai/explain`, body `{ tokenId }` or `{ verseId }`, validated with Zod. The
  client sends only ids and never any text or prompt. The server assembles everything else.
- **Context object** (a shared Zod schema, and the only thing the model sees besides the
  instructions):
  - the target sentence (verse ref and surface text);
  - its tokens, each with word, lemma, gloss and source, POS, the decoded morphology and labels,
    and the parse code;
  - the surrounding verses (±1);
  - the learner's known lemmas (in review, interval ≥ 1 day), studied concepts, disclosure level
    and experience level;
  - the curated grammar concepts matched by `grammar_concept_rules`.
- **Context builder.** A pure function in `packages/shared`, fed by existing queries rather than
  new SQL:
  - `getPassage` / `getTokenDetail` (reading/queries.ts): tokens with lemma and morphology, and
    matched concepts;
  - `verseSnippet`, called once for each neighbouring verse;
  - `knownLemmasInPassage` and the grammar progress query: what the learner knows.
- **Grounding rules**, in the system prompt and checked after generation:
  - The model explains the supplied analysis. It must not assert a case, tense, voice, mood,
    person, number or gender that contradicts the token data.
  - A post-check parses the answer's claims about each word against the token's morphology. On a
    mismatch it drops the sentence, or retries once and otherwise returns the curated note only.
  - No translations of whole verses; the MVP ships no English translation (CLAUDE.md).
- **Provider** behind an `Explainer` interface (`explain(context) → { text, model }`), with the
  model id from env. The provider key is a server-only secret.
- **Access and cost:**
  - Auth is required, so the anonymous cookie is not enough.
  - Per-user and global rate limits: a small daily quota, and a token bucket keyed by user
    id in Postgres, to avoid a new service.
  - Responses are cached by (context hash, model), since many learners ask about the same
    token.
  - Each call is logged with its user, token and latency, but never with prompt text beyond
    the ids.
- **UI.** An "Explain more" action in the word sheet, clearly labelled as AI-generated, and shown
  below the curated "Why this form?" note, never in place of it.

**Consequences.** Nothing is built now. The data needed already exists and is exposed by
functions that can be reused as they are. Auth is the prerequisite.

## 025 — API rate limiting: in-memory, per client IP

**Context.** Before a public deploy there was no rate limiting. Each `POST /session/anonymous`
without a cookie creates a `users` row, so one script could fill the table. Every other endpoint
was unlimited too.

**Decision.**

- **Two limits, both per client IP, with fixed windows** (`src/http/rate-limit.ts`):
  - all requests: 600 a minute;
  - new anonymous users: 60 an hour. Returning learners (with a valid cookie) are never limited
    by this one.
- Both answer `429` in the shared error shape (`rate_limited`), with `Retry-After`.
  `/health` and CORS preflights don't count.
- **The key is the last `X-Forwarded-For` entry.** The API only receives requests through
  Caddy (or Nginx) and then Next's `/api` rewrite:
  - The API's socket peer is always the web container, so keying on the socket would put every
    learner in one bucket.
  - Caddy replaces a client-supplied `X-Forwarded-For` with the real address, and Next passes
    it through. This was verified on the local production stack: a spoofed value arrived
    replaced, and spoofing different values didn't get round the new-user limit.
  - Nginx's `$proxy_add_x_forwarded_for` appends, so the last entry is right there too.
- **In memory.** There is one API instance, so a `Map` of windows (pruned once per window) is
  enough, and no new service is needed. Several instances would need Postgres or Redis.
- **Configuration:**
  - On by default only in production. `RATE_LIMIT_PER_MINUTE` and `NEW_SESSIONS_PER_HOUR`
    override the limits, and 0 turns one off.
  - Development and tests default to off, so e2e runs, which create a user per test from one
    IP, never trip them.
  - An empty value (Compose passing an unset variable) means the default, not 0.

**Consequences.** Limits reset when the API restarts, which is acceptable for abuse protection.
Many learners behind one IP (a school) share a budget: 60 new users an hour is enough for a
class, and it can be raised in `deploy/.env`. There is no limit at the proxy layer, since the
standard Caddy image has no rate-limit module.

## 026 — Continuous integration: GitHub Actions

**Decision.** `.github/workflows/ci.yml` runs on pull requests and pushes to `main`, with three
parallel jobs:

- **check:** `pnpm check` (typecheck, lint, format, unit and API tests) against a Postgres 18
  service container.
- **e2e:** `pnpm release` (migrate, full NT import, seed), then Chromium and every Playwright
  project, including the PWA project against a production build. Traces are uploaded on
  failure.
- **docker:** both production images build.

Details:

- Setup is `pnpm/setup@v3`, which reads pnpm from `packageManager` and installs Node 24, with
  the pnpm store cached and a frozen-lockfile install. `actions/checkout@v7`. The versions were
  checked against each action's latest release and README.
- Permissions are read-only, and superseded runs are cancelled.

**Verified before committing:**

- actionlint is clean.
- The check and e2e steps were run in a clean `node:24-bookworm` container from a fresh copy of
  the repo (no `.env`, no `node_modules`) with a Postgres 18 container. Everything passed, after
  two fixes the dry run found:
  - Next's standalone server binds to `$HOSTNAME`, which in containers is the container id, so
    the PWA test server is now started with `HOSTNAME=127.0.0.1`. The production image already
    sets `HOSTNAME=0.0.0.0`.
  - The font-coverage e2e test compared whole NFD strings, which Linux Chromium shapes
    differently from macOS. The app renders only NFC, so the test now checks the rendered
    passage, precomposed forms and each combining mark on its own.

## 027 — Recovery codes: carrying anonymous progress to another browser

**Context.** Progress belongs to an anonymous user identified only by an httpOnly cookie
(CLAUDE.md: identity without auth). Clearing cookies or changing device loses it, with no way
back. Full sign-in is a bigger step and needs personal data (an email address). A recovery code
fixes the loss without collecting anything.

**Decision.**

- **Format.** 80 random bits (`crypto.randomBytes(10)`) written as 16 Crockford base-32
  characters in groups of four, e.g. `K7QM-3XJ9-PT2W-HV8C`.
  - There's no I, L, O or U. On entry, case, spaces, hyphens and pasted dashes are ignored, and
    O, I and L are read as 0, 1 and 1.
  - Encoding and normalising are pure functions in `packages/shared` and are tested there. The
    restore request schema normalises the input.
- **Storage.** Only a SHA-256 hash (`users.recovery_code_hash`, unique) and its creation time,
  in migration 0004, which is additive; a check constraint keeps the two columns together.
  - A fast hash is enough because the secret is 80 random bits: there is no dictionary to try,
    unlike a password.
  - The code is shown once, when it is made. Afterwards the app knows only its date.
- **API:**
  - `POST /me/recovery-code` makes a code, or replaces the old one, and returns it once.
  - `POST /session/restore` takes `{ code }`. On a match it points this browser's session
    cookie at that learner and returns the session. Otherwise it answers 404
    `recovery_code_not_found`.
  - The session response gains `recoveryCodeCreatedAt`.
- **Guessing.** Failed restores are limited to 10 per IP per hour, in every environment, not
  only production (025). Only failures count. At 80 bits, guessing is hopeless even without the
  limit.
- **Restoring replaces, never merges.** The browser's previous anonymous user is left as it was
  and is no longer referenced; the UI says so before restoring. Device-only preferences (name,
  text size, theme) stay on each device.
- **UI:**
  - A "Keep your progress" card in Settings: make a code, shown once with Copy; replace it
    behind a shadcn AlertDialog.
  - A `/restore` page, linked from Welcome and Settings.
  - After a restore, the cached session promise is reset and the app returns to Today.

**Consequences.**

- No personal data is collected, and anyone holding a code can open that learner's progress;
  the UI says so.
- Abandoned anonymous users accumulate after restores. They are small, and pruning them can
  come later.
- When sign-in arrives, it can attach to the same `users` row. A code can then become a way
  back into an account instead of the only one.
- Dependencies: the `alert-dialog` registry component (restyled), with no new package, since
  `radix-ui` already includes it.

## 028 — Pronunciation audio: pre-generated ElevenLabs recordings

**Context.** The device voice from 021 sounded robotic, and the user asked for accurate, clear
pronunciation. Modern Greek is acceptable (the user's choice; no voice service speaks Erasmian).
The text is fixed, so audio can be generated once instead of synthesised live.

**Decision.**

- **Provider.** ElevenLabs text-to-speech, chosen over Google or Azure neural voices for
  naturalness. It is used only by a local script, never at run time, so no API key is deployed.
- **Choice by listening.** A bake-off covered 3 native Greek library voices (Kyriakos, Eleni,
  Theos), 3 models (Multilingual v2, v3, Flash v2.5) and two spellings. The user chose
  **Kyriakos, `eleven_v3`, monotonic spelling with one-syllable accents kept** (καί, ήν).
  - Strict modern spelling (και, ην) was tried and sounded worse, so `speakableText` keeps
    monosyllable accents.
  - Its one other rule stays: a word keeps only its first accent (ὄνομά μου → όνομα μου). 613
    distinct NT words carried an enclitic's second accent.
  - The conversion moved to `packages/shared`, because the generator and the web app both use it.
- **What is recorded:** for the curated passages, every verse, plus every word form (the word
  sheet) and dictionary form (the new-word cards). That is 387 clips and 5,583 characters, about
  US$0.56 at the v3 list price.
  - Words are keyed by `spokenWordKey`, the spoken spelling in lower case, so repeated and
    capitalised forms share a clip. Verses are keyed by reference.
- **Generator:** `pnpm audio:generate`.
  - It is a dry run by default, reporting the clip count, characters and cost. `--yes` spends,
    under a `--max-chars` budget.
  - It skips existing clips and makes three requests at a time, retrying 429 and 5xx responses.
    It stops at once on 401, 402 or 403.
  - It writes each clip to a temporary file and renames it, and saves the manifest even if
    interrupted. It flags word clips over 2 seconds for a listen, since there's no ffmpeg to
    trim silence.
  - Clip file names are hashes of the text and every voice setting, so changing the voice,
    model, seed or text makes new files and never serves stale audio. `--prune` removes files
    no longer referenced.
- **Files.** mp3 at 44.1 kHz and 128 kbps, the quality judged in the bake-off, in
  `apps/web/public/audio/` with `manifest.json`. They take 18 MB, committed to git.
  - v3 pads single words with about 2 seconds of silence _after_ the word. Measured: speech
    starts within 0.15s, so taps don't lag. Verses have almost none.
  - Trimming would shrink the folder to about 7 MB, but needs ffmpeg or a hand-written MP3
    frame trimmer, so it's left for now.
  - Object storage can come later if the audio grows much.
- **Playback.**
  - Recordings first, then the device voice (021) for anything unrecorded or on error. Listen
    plays verse by verse and stops at once.
  - Clips are fetched whole and played from memory, not streamed. The service worker can then
    serve them offline: media elements make range requests that a cached file can't answer,
    Safari especially.
  - The service worker keeps played clips cache-first (content-hashed names, capped at 500) and
    fetches the manifest network-first.
- **Attribution.** ElevenLabs is a fourth `data_sources` row, so it is listed on About. Its
  licence is stated cautiously ("used under the ElevenLabs Terms of Service"), because whether
  the account's pay-as-you-go credits include commercial rights is still for the owner to
  confirm.

**Consequences.**

- The recordings are fixed, so learners always hear the same thing; regenerating costs credits.
- The voice belongs to its library creator, who could withdraw it later. The files we have stay
  ours to use; only future regeneration would need a new voice.
- New passages need `pnpm audio:generate -- --yes`, and only the new clips are generated.
- Before the app is public, confirm the ElevenLabs plan covers commercial use.

## Dependencies

One line each, for why the dependency exists.

- `hono`: API framework (specified).
- `@hono/node-server`: runs Hono on Node's HTTP server.
- `zod`: runtime validation for env, requests and shared response schemas (specified).
- `tsx`: runs the TS API without a build step, in dev (watch) and in production (023).
- `vitest`: unit and API tests. It runs TS natively and Hono's `app.request()` makes route tests cheap.
- `prettier`: formatting.
- `typescript-eslint`, `@eslint/js`: lint rules for the non-Next packages.
- `@types/node` (^22): Node types matching the minimum supported runtime.
- `drizzle-orm`, `drizzle-kit`: ORM and migration generator (specified).
- `postgres`: Postgres driver for Drizzle. It needs no native build step and ships its own types.
- `@playwright/test` (web, dev): end-to-end tests (specified). Chromium only.
- `zod`, `@gbt/shared` in web: to validate API responses against the shared schemas.
- `vitest` (web, dev): unit tests for pure web helpers (the Markdown subset parser).
- `radix-ui` (web): accessible primitives behind the shadcn components (checkbox, radio group,
  toggle group, slider, progress, label).
- `vaul` (web): the bottom-sheet Drawer (swipe to dismiss) used for the word sheet.
- `class-variance-authority`, `cn` (web): component variants and class merging for the shadcn
  components (`cn` is shadcn's compiled drop-in for `clsx` + `tailwind-merge`, MIT).
- `lucide-react` (web): the icon set shadcn components use.
- `tw-animate-css` (web): the enter and exit animations shadcn components reference.
- `shadcn` (web, dev): the CLI for adding registry components, and its `shadcn/tailwind.css`
  base styles.
- `caddy:2-alpine` (deploy image, not a package): TLS and reverse proxy in production (023).
