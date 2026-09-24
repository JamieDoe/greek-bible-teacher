import { passageContent } from "../content/passages";
import { seedPassages } from "../content/seed";
import { createDb } from "../db/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[seed] DATABASE_URL is not set");
  process.exit(1);
}

const { db, client } = createDb(url, { max: 1 });
try {
  const n = await seedPassages(db, passageContent);
  console.log(`[seed] ${n} passage(s) upserted`);
} catch (err) {
  console.error("[seed] failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
