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
max ids are unchanged. If a future pin removes tokens or verses, the leftover rows make the count
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
- `@playwright/test` (web, dev): end-to-end tests (specified). Chromium only.
- `zod`, `@gbt/shared` in web: to validate API responses against the shared schemas.
