import { seededRng } from "@gbt/shared";
import { sql } from "drizzle-orm";
import { inject } from "vitest";
import { createApp } from "../src/app";
import { passageContent } from "../src/content/passages";
import { seedPassages } from "../src/content/seed";
import { createDb, type Db } from "../src/db/client";
import { parseEnv } from "../src/env";
import { importNt } from "../src/ingest/import-nt";
import { loadSources } from "../src/ingest/load";

export const WEB_ORIGIN = "http://localhost:3000";

export const T0 = new Date("2026-03-01T09:00:00Z");

/**
 * An app wired to the test database with a controllable clock (`clock.now`) and seeded
 * shuffles, plus the DB handle for assertions.
 */
export function testApp() {
  const env = parseEnv({ NODE_ENV: "test", WEB_ORIGIN, DATABASE_URL: inject("testDatabaseUrl") });
  const { db, client } = createDb(env.DATABASE_URL, { max: 2 });
  const clock = { now: T0 };
  const app = createApp({
    env,
    db,
    pingDb: async () => {},
    now: () => clock.now,
    rng: seededRng(7),
  });
  return { app, db, clock, close: () => client.end() };
}

/** Resets text tables and imports John only (enough for the slice), then seeds passages. */
export async function importJohn(db: Db) {
  await db.execute(sql`
    truncate data_sources, books, chapters, verses, tokens, lemmas, morphology, passages, users
    restart identity cascade`);
  const all = await loadSources();
  await importNt(db, { ...all, books: all.books.filter((b) => b.book.abbrev === "JHN") });
  await seedPassages(db, passageContent);
}

/** Pulls `name=value` out of a Set-Cookie header, for sending back as a Cookie header. */
export function cookieFrom(res: Response): string {
  const header = res.headers.get("set-cookie") ?? "";
  return header.split(";")[0] ?? "";
}
