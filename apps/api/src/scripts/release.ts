// Runs on every deploy, before the new API starts: migrations, then the (idempotent) NT import
// and curated content. Each step is safe to repeat, so a failed deploy can simply be re-run.
import { grammarContent } from "../content/grammar";
import { lessonContent } from "../content/lessons";
import { passageContent } from "../content/passages";
import { seedPassages } from "../content/seed";
import { seedGrammar } from "../content/seed-grammar";
import { seedLessons } from "../content/seed-lessons";
import { createDb } from "../db/client";
import { runMigrations } from "../db/migrate";
import { importNt } from "../ingest/import-nt";
import { loadSources } from "../ingest/load";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[release] DATABASE_URL is not set");
  process.exit(1);
}

const started = Date.now();
const elapsed = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;

try {
  await runMigrations(url);
  console.log(`[release] migrations applied (${elapsed()})`);
} catch (err) {
  console.error("[release] migrations failed:", err);
  process.exit(1);
}

const { db, client } = createDb(url, { max: 1 });
try {
  const summary = await importNt(db, await loadSources());
  console.log(`[release] NT imported (${elapsed()}): ${summary.tokens} tokens`);
  const passages = await seedPassages(db, passageContent);
  const concepts = await seedGrammar(db, grammarContent);
  const lessons = await seedLessons(db, lessonContent);
  console.log(
    `[release] seeded ${passages} passages, ${concepts} concepts, ${lessons} lessons (${elapsed()})`,
  );
} catch (err) {
  console.error("[release] failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
