import { createDb } from "../db/client";
import { importNt } from "../ingest/import-nt";
import { loadSources } from "../ingest/load";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[ingest] DATABASE_URL is not set");
  process.exit(1);
}

const { db, client } = createDb(url, { max: 1 });
try {
  const started = Date.now();
  const input = await loadSources();
  const summary = await importNt(db, input);
  console.log(`[ingest] done in ${((Date.now() - started) / 1000).toFixed(1)}s`, summary);
} catch (err) {
  console.error("[ingest] failed; nothing was written:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
