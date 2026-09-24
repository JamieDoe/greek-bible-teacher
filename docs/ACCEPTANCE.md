# MVP acceptance test

CLAUDE.md requires an acceptance test to pass end to end in Phase 6 but does not define one. This
is the agreed version (2026-09-24), automated in `apps/web/e2e/acceptance.spec.ts`.

A brand-new anonymous learner, on a fresh browser:

1. **Onboards.** Opening the app redirects to onboarding. They choose Greek experience and daily
   minutes. No account and no personal data are involved.
2. **Sees Today.** It shows Lesson 1 ("In the beginning was the Word"), its grammar concept (the
   article and case), its passage (John 1:1–5), the due count (0) and zeroed progress.
3. **Completes the daily loop** in the lesson stepper:
   1. **Review due**: nothing is due yet, so they continue.
   2. **New vocabulary**: λόγος, θεός, ἀρχή, καί, εἰμί. Each is introduced, then asked and
      answered.
   3. **Grammar**: "The article and case: who is what", marked as studied.
   4. **Guided reading**: John 1:1–5 from the database. They tap words (the lookup panel opens
      and is dismissed) and finish the passage.
   5. **Look closer**: the passage's nominatives and accusatives are highlighted with curated
      notes.
   6. **Recall**: they review the new words plus the words they looked up.
   7. **Re-read**: they read John 1:1–5 again and finish.
4. **Returns to Today.** It shows Lesson 1 done today and Lesson 2 up next. Progress shows 6
   words in review (5 new plus 1 looked up), 1 passage read, 1 concept studied and 1 lesson done.

Run it with the other e2e tests:

```bash
pnpm db:up && pnpm db:migrate && pnpm ingest && pnpm seed
```

```bash
pnpm test:e2e
```
