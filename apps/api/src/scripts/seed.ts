import { grammarContent } from "../content/grammar";
import { passageContent } from "../content/passages";
import { seedPassages } from "../content/seed";
import { lessonContent } from "../content/lessons";
import { seedGrammar } from "../content/seed-grammar";
import { seedLessons } from "../content/seed-lessons";
import { createDb } from "../db/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[seed] DATABASE_URL is not set");
  process.exit(1);
}

const { db, client } = createDb(url, { max: 1 });
try {
  const passages = await seedPassages(db, passageContent);
  const concepts = await seedGrammar(db, grammarContent);
  const lessons = await seedLessons(db, lessonContent);
  console.log(`[seed] ${passages} passages, ${concepts} grammar concepts, ${lessons} lessons`);
} catch (err) {
  console.error("[seed] failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
