import { grammarContent } from "../content/grammar";
import { passageContent } from "../content/passages";
import { seedPassages } from "../content/seed";
import { seedGrammar } from "../content/seed-grammar";
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
  console.log(`[seed] ${passages} passage(s) and ${concepts} grammar concept(s) upserted`);
} catch (err) {
  console.error("[seed] failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
