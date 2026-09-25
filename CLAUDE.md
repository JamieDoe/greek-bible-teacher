@apps/web/AGENTS.md

- Pure domain logic (SRS scheduling, parse-code decoding, difficulty scoring) lives once, in `packages/shared`, and is tested there. No business logic is duplicated between web and api.
- The web app talks to the API over HTTP only. It never touches the DB directly.
- Do not add more packages or services unless clearly justified in DECISIONS.md.

---

# GREEK DATA

**Sources.** Verify every licence yourself from the upstream repository/site before use. Do not rely on this prompt's summary as legal fact.

- **Text + morphology:** MorphGNT `sblgnt` (github.com/morphgnt/sblgnt). This is the SBLGNT text with morphological parsing and lemmatisation. Read its README/licence files. The text and the analysis may carry different licences (reported as CC BY for SBLGNT and CC BY-SA for the MorphGNT analysis). Record exactly what the source states.
- **English glosses:** you must find an openly licensed or public-domain lexical source keyed to lemmas (candidates to investigate: the Dodson Greek lexicon, STEPBible data such as TBESG, Abbott-Smith). Choose one, verify its licence, and document the choice.
  - If no verified source is usable, stop and ask. Do not invent glosses at scale.
  - Hand-curated glosses for the MVP vocabulary are acceptable if marked `source='curated'`.
- **English translations:** none in the MVP. Do not scrape any translation.

**Attribution.**

- Store licence + attribution per source in a `data_sources` table.
- Record the source on imported rows.
- Show attribution in the app (an About/Sources screen plus a footer link on the reader).
- Keep the raw files and licence texts in `data/`.

**MorphGNT format.** Check the repo README and do not assume columns. It is reported as one token per line with:

- book/chapter/verse reference
- part-of-speech code
- an 8-character parse code (person, tense, voice, mood, case, number, gender, degree)
- text with punctuation
- word
- normalised word
- lemma

Write a decoder for parse codes → structured morphology and human-readable labels. Cover it with thorough tests.

**Distinguish explicitly:** surface form (with punctuation), word, normalised form, lemma, gloss, part of speech, morphology parse, lexical info.

**Ingestion requirements:**

- Import the **entire NT** into the text tables. The learning corpus is a small curated subset, but the schema and data must cover everything.
- Scripts must be idempotent and re-runnable.
- Validate row counts per book and fail loudly on malformed lines.
- Compute lemma NT frequency from the imported tokens (never hardcode it).
- Do Unicode NFC normalisation consistently. Preserve the original surface text.

---

# DATA MODEL (refine as needed and document changes)

**Text:**

- `data_sources`: id, name, version, licence, attribution, url
- `books`: id, name, abbrev, order, testament
- `chapters`: id, book_id, number
- `verses`: id, chapter_id, number, ref (e.g. `JHN 1:1`), unique(book, chapter, verse)
- `tokens`: id, verse_id, position, surface, word, normalized, lemma_id, morphology_id, source_id. Unique on (verse_id, position).

**Lexicon:**

- `lemmas`: id, lemma (unique), gloss, extended_gloss, part_of_speech, nt_frequency, gloss_source_id
- `morphology`: id, parse_code, pos_code (unique pair); decoded columns: person, tense, voice, mood, case, number, gender, degree. One row per distinct analysis, shared by tokens.

**Curriculum:**

- `grammar_concepts`: id, slug, order, title, summary_simple, body (markdown), terminology_level, example_token_ids / example_refs
- `grammar_concept_rules`: concept_id plus a morphology/POS matcher (e.g. `case=dative`), used to link tokens to relevant concepts
- `passages`: id, title, start_verse_id, end_verse_id, difficulty_score, curriculum_order, required_concept_ids
- `lessons`: id, order, title, passage_id
- `lesson_items`: lesson_id, order, kind (`vocab` | `grammar` | `reading` | `review`), lemma_id / concept_id / passage_id

**Learner:**

- `users`: id (uuid), created_at, experience_level, daily_minutes, auth fields nullable/absent for now
- `user_word_progress`: user_id, lemma_id, correct_count, incorrect_count, difficulty, stability, interval_days, next_review_at, last_reviewed_at, lookups_count, first_seen_at. Unique pair.
- `user_grammar_progress`: user_id, concept_id, status, studied_at
- `user_reading_progress`: user_id, passage_id, times_read, completed_at, last_read_at, tokens_looked_up
- `review_events` (append-only log): user_id, lemma_id, grade, reviewed_at, context. This log enables FSRS later.

Use FK constraints, unique constraints, NOT NULL where sensible, and indexes on lookup paths (tokens by verse, lemma by frequency, due reviews by user + next_review_at).

**Identity without auth:**

- On first visit the API creates an anonymous `users` row and returns its id.
- Store the id in an httpOnly cookie (not client-exposed JS state).
- All learner tables reference `users.id`, so auth can later attach to the same row.
- Store no sensitive personal data until auth exists.

---

# LEARNING MODEL

**Daily loop:** Review due → New vocabulary → Grammar concept → Guided reading → Word/form investigation → Recall/review → Re-read.

**Vocabulary selection**, in priority order:

1. Words required by the current passage that are not yet known.
2. High NT-frequency lemmas.
3. Words the learner struggles with (incorrect ratio, repeated lookups during reading).
4. Stage-appropriate words.

Never select words randomly. Keep this as a small, tested, pure function.

**Spaced repetition (MVP):**

- Use a simple SM-2-style scheduler in `packages/shared`.
- Grades: `again` / `hard` / `good` / `easy`.
- Update difficulty, stability/interval, next_review_at, counts.
- A token lookup during reading counts as a weak signal: it nudges the word toward earlier review. It is not a failed review.
- Put the scheduler behind a single interface so FSRS can replace it later.
- Test it thoroughly with fixed dates.

**Review exercises (recognition-first):**

- Greek → choose the English gloss (distractors come from the same POS and similar frequency).
- Greek form in its verse context → gloss.
- Missed items resurface within the same session.

**Grammar curriculum.**
Write 20–30 concise concepts, ordered by what is needed to read the curated passages. Refine the list below if the reading goal suggests a better order, and document the reasoning. Each concept:

- starts simple
- uses real NT examples, linked to token ids where possible
- states why it matters for reading
- defers terminology to expanded views

Suggested starting order:

1. Alphabet & pronunciation (Erasmian; note alternatives)
2. Reading accents/breathings (just enough)
3. The article (ὁ, ἡ, τό)
4. Nouns: case shows role
5. Nominative & accusative
6. Genitive ("of")
7. Dative ("to/for/in/by")
8. Gender & number
9. Prepositions and the case they take
10. καί, δέ, γάρ, ὅτι, and other connectors
11. εἰμί (ἐστίν / ἦν)
12. Personal pronouns (αὐτός)
13. Demonstratives (οὗτος, ἐκεῖνος)
14. Adjectives & article–adjective positions
15. Present active indicative
16. Aorist indicative
17. Imperfect
18. Future
19. Perfect
20. Middle/passive voice
21. Negation (οὐ / μή)
22. Relative pronouns & clauses
23. Infinitives
24. Participles: adjectival
25. Participles: adverbial
26. Subjunctive (ἵνα, ἐάν)
27. Imperative
28. Common word-order patterns

**For the vertical slice, author only what John 1:1–5 needs first.** Suggested:

- 5 words: λόγος, θεός, ἀρχή, καί, εἰμί (ἦν)
- 1 concept: "The article and case: who is what" (ὁ λόγος vs τὸν θεόν)

**Passage difficulty (simple MVP):** a score from average lemma frequency rank, the share of tokens outside the top-N lemmas, verse length, and the count of required concepts not yet covered. Make it a pure, tested function. Store the score on `passages`.

**Initial curated corpus:** John 1:1–5 first, then roughly 6–12 short, high-frequency passages (e.g. more of John 1, 1 John 1, selected Johannine/Markan verses). Choose them using the difficulty score plus judgement, and document the choices.

---

# UX REQUIREMENTS

**Screens:**

1. Onboarding (Greek experience, daily minutes; no account)
2. Today/Home (today's session, due count, current concept, current passage, basic progress)
3. Daily Lesson (stepper through the loop)
4. Vocabulary Review
5. Reader
6. Progress

Minimal navigation: bottom nav with Today / Read / Review / Progress.

**The Reader is the most important screen:**

- Real Greek text with a verse reference and verse numbers, rendered with generous line-height and size.
- Every token is a button (tap and keyboard focusable). Punctuation is displayed but is not a target.
- Tapping opens a **bottom sheet / inline panel**, never a new page. It shows:
  - **Beginner:** gloss, large.
  - **Expanded:** lemma + "Noun · Dative · Singular · Feminine".
  - **Advanced:** full parse terminology and code, NT frequency, other occurrences in the corpus.
  - A "Why this form?" note, only from curated grammar content matched via `grammar_concept_rules`. Never generate it.
- Dismiss by tap outside, swipe down, or Esc, and return exactly to the reading position.
- The disclosure level is remembered per user.
- A "Finish passage" action records reading progress and offers a review of the words looked up.
- A "Read again" action is available.

**Typography:**

- Use a high-quality polytonic Greek font, self-hosted, with a verified licence (e.g. Gentium Plus, SBL Greek if its licence permits; check).
- Test combining diacritics render correctly.
- Pay close attention to sizes and line-height on mobile.

**Visual direction:**

- Quiet, warm, scholarly, premium.
- Neutral paper-like light theme and a true dark theme.
- Generous whitespace and restrained colour. No confetti, mascots or startup gradients.

**Progress screen shows real counts:**

- words learned (reviewed with stable interval ≥ N days)
- Greek words read
- passages completed
- concepts studied
- review accuracy
- reading activity over time

No proficiency %.

**Standards:** every data view has loading, error and empty states. Accessibility: semantic HTML, focus management in the sheet, adequate contrast, `lang="grc"` on Greek text.

**PWA:** manifest, icons, installable. Offline caching of the app shell and recently read passages in Phase 8 only.

---

# API (Hono, REST, Zod-validated)

Start with only what the slice needs, and add endpoints only when a screen needs them.

- `POST /session/anonymous` — create or return the anonymous user
- `POST /me/onboarding`
- `GET /today` — due count, next lesson, current concept, current passage
- `GET /lessons/:id`
- `GET /passages/:id` — verses + tokens with lemma + morphology inline, so one request renders the reader
- `GET /tokens/:id` — full lookup detail, related occurrences, matched concepts
- `GET /grammar/:slug`
- `GET /review/queue`
- `POST /review/:lemmaId` — grade
- `POST /reading/:passageId/lookup`
- `POST /reading/:passageId/complete`
- `GET /progress`

Rules:

- Validate every input with Zod, server-side.
- Use consistent error shapes.
- Share request/response types via `packages/shared`.
- Configure CORS explicitly.

---

# AI PHASE 2 (design only, do not implement)

Document in DECISIONS.md, without writing code:

- A future `POST /ai/explain` endpoint that receives a server-assembled context object: Greek sentence, tokens, lemmas, glosses, morphology, surrounding verses, the user's known lemmas, studied concepts and level.
- The model explains; it does not assert morphology that contradicts the supplied data.
- Rate limiting, auth required, and a provider kept behind an interface.
- Keep the context-builder shape in mind: the token-lookup queries should be reusable for it.

---

# IMPLEMENTATION PHASES

The app must be runnable after every phase. Do not start a phase's work early.

0. **Setup:** pnpm workspace, TS strict, lint/format, Docker Compose for Postgres, env handling (`.env.example`, no secrets committed), health endpoint, blank web shell.
1. **Schema + migrations:** Drizzle schema per the data model, first migration, db client.
2. **Data ingestion:** fetch/pin MorphGNT SBLGNT, parse-code decoder, full NT import, lemma frequencies, gloss source import, data_sources + attribution. Ingestion tests.
3. **Reader + token lookup:** John 1:1–5 rendered from the DB with a working tap panel and progressive disclosure.
4. **Vocabulary + review:** SRS scheduler, review queue, review UI, lookup signals.
5. **Grammar:** content for the slice concept first, then the curriculum. Rules linking tokens to concepts. Grammar progress.
6. **Daily session:** lesson stepper wiring review → vocab → grammar → reading → review → re-read. **The acceptance test must pass end-to-end here.**
7. **Progress:** metrics screen.
8. **PWA/mobile polish:** manifest, offline shell, typography and dark mode refinement.
9. **Deployment:** production Dockerfiles, Compose for VPS, reverse-proxy notes (Nginx/Caddy), migration-on-deploy, Postgres backup note.

Build a thin but real slice of Phase 3 as early as practical. Seeing John 1:1 from real data de-risks everything else.

---

# CODING STANDARDS

- TypeScript strict. No `any` without justification. Explicit types at module boundaries.
- Use Drizzle for all DB access (parameterised). Raw SQL only when necessary, and still parameterised.
- Add DB constraints for integrity rather than relying on app code alone.
- Secrets live only in env vars. Server secrets are never exposed to the client (`NEXT_PUBLIC_` only for genuinely public values).
- Error handling must be useful: log with context and send user-friendly messages to clients.
- No premature abstraction. Before adding any dependency, ask whether the platform or existing packages already cover it.
- Keep files and modules small and named by domain (reading, vocabulary, review, grammar, progress).

# TESTING (meaningful only; no coverage padding)

- Ingestion: line parsing, parse-code decoding for every code seen, counts per book, known verses (John 1:1 tokens/lemmas exactly correct).
- Token lookup: correct lemma/morphology/gloss for known tokens.
- SRS: scheduling across grades and dates, lookup signal effect.
- Vocabulary selection and difficulty scoring: deterministic fixtures.
- API: validation failures and happy paths for slice endpoints, run against a test database.
- UI: one Playwright test covering the MVP acceptance flow, plus tap → panel → dismiss in the reader.

---

# HOW YOU WORK

1. **Inspect the repository first.** Summarise what exists before changing anything.
2. Briefly state the plan for the current phase (a few bullets), then implement.
3. Work in small increments. After each meaningful change, run typecheck, lint and relevant tests, and fix failures before moving on.
4. **Never invent** APIs, library options, dataset formats, file columns or licence terms. When unsure, read the official docs or the source repository/README. If you still can't verify, say so and choose the safest option.
5. Install no unnecessary dependencies. Justify each new one in one line in DECISIONS.md.
6. Keep the app runnable at the end of every phase.
7. Do not implement future-phase or post-MVP features.
8. Ask for clarification only when genuinely blocked (e.g. no verifiable gloss licence). Otherwise make a pragmatic decision, record it and continue.
9. Maintain `docs/STATUS.md`: current phase, done, next, known issues. Keep it concise and update it at the end of each phase.
10. Maintain `docs/DECISIONS.md`: short ADR-style entries covering context, decision, and consequences.
11. **Never silently substitute mocked data for real data** once the real source is available. If a placeholder is temporarily unavoidable, mark it clearly in code and in STATUS.md.
12. At each phase end, report: what changed, how to run it, test results, and what's next.
