import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createDb } from "../db/client";
import { dataSources, lemmas, morphology, tokens, verses } from "../db/schema";
import { type ImportInput, importNt } from "./import-nt";
import { loadSources } from "./load";

// Imports John and 3 John (not the whole NT) to keep the test fast.
const { db, client } = createDb(inject("testDatabaseUrl"), {
  max: 1,
  statementTimeoutMs: 30_000,
  quiet: true,
});
let subset: ImportInput;
/** 3 John alone (219 tokens), for properties that don't need John's text. */
let small: ImportInput;

beforeAll(async () => {
  const all = await loadSources();
  subset = { ...all, books: all.books.filter((b) => ["JHN", "3JN"].includes(b.book.abbrev)) };
  small = { ...all, books: all.books.filter((b) => b.book.abbrev === "3JN") };
});
afterAll(() => client.end());
beforeEach(async () => {
  await db.execute(sql`
    truncate data_sources, books, chapters, verses, tokens, lemmas, morphology
    restart identity cascade`);
});

async function tokenLookup(ref: string, position: number) {
  const [row] = await db
    .select({
      surface: tokens.surface,
      lemma: lemmas.lemma,
      gloss: lemmas.gloss,
      frequency: lemmas.ntFrequency,
      case: morphology.case,
      tense: morphology.tense,
      source: dataSources.key,
    })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(lemmas, eq(lemmas.id, tokens.lemmaId))
    .innerJoin(morphology, eq(morphology.id, tokens.morphologyId))
    .innerJoin(dataSources, eq(dataSources.id, tokens.sourceId))
    .where(and(eq(verses.ref, ref), eq(tokens.position, position)));
  return row;
}

describe("importNt", { timeout: 60_000 }, () => {
  it("imports tokens with lemma, morphology, gloss and source", async () => {
    const summary = await importNt(db, subset);
    expect(summary.tokens).toBe(15438 + 219);

    expect(await tokenLookup("JHN 1:1", 2)).toEqual({
      surface: "ἀρχῇ",
      lemma: "ἀρχή",
      gloss: "ruler, beginning",
      frequency: expect.any(Number),
      case: "dative",
      tense: null,
      source: "morphgnt-sblgnt",
    });
    expect(await tokenLookup("JHN 1:1", 3)).toMatchObject({ lemma: "εἰμί", tense: "imperfect" });
  });

  it("computes lemma frequency by counting imported tokens", async () => {
    await importNt(db, subset);
    const expected = subset.books
      .flatMap((b) => b.tokens)
      .filter((t) => t.lemma === "λόγος").length;
    const [row] = await db.select().from(lemmas).where(eq(lemmas.lemma, "λόγος"));
    expect(row?.ntFrequency).toBe(expected);
    expect(row?.partOfSpeech).toBe("noun");
  });

  it("assigns verse ordinals in canonical order", async () => {
    await importNt(db, subset);
    const rows = await db
      .select({ ref: verses.ref, ordinal: verses.ordinal })
      .from(verses)
      .where(sql`${verses.ref} in ('JHN 1:1', 'JHN 21:25', '3JN 1:1')`)
      .orderBy(verses.ordinal);
    expect(rows.map((r) => r.ref)).toEqual(["JHN 1:1", "JHN 21:25", "3JN 1:1"]);
  });

  it("is idempotent: a second run changes nothing and keeps ids", async () => {
    const fingerprint = async () => {
      const [row] = await db.execute<{ fp: string }>(sql`
        select md5(string_agg(t.id || ':' || t.verse_id || ':' || t.position || t.surface
          || t.lemma_id || ':' || t.morphology_id || ':' || l.nt_frequency, ',' order by t.id)) as fp
        from ${tokens} t join ${lemmas} l on l.id = t.lemma_id`);
      return row?.fp;
    };
    await importNt(db, small);
    const first = await fingerprint();
    await importNt(db, small);
    expect(await fingerprint()).toBe(first);
  });

  it("never overwrites a curated gloss", async () => {
    await importNt(db, small);
    const [curated] = await db
      .insert(dataSources)
      .values({ key: "curated", name: "Curated", licence: "project", attribution: "project" })
      .returning();
    await db
      .update(lemmas)
      .set({ gloss: "word", glossSourceId: curated!.id })
      .where(eq(lemmas.lemma, "ἀγαπητός"));

    await importNt(db, small);
    const [row] = await db.select().from(lemmas).where(eq(lemmas.lemma, "ἀγαπητός"));
    expect(row).toMatchObject({ gloss: "word", glossSourceId: curated!.id });
  });

  it("records licence and attribution for every source", async () => {
    await importNt(db, small);
    const rows = await db.select().from(dataSources).orderBy(dataSources.key);
    expect(rows.map((r) => [r.key, r.licence])).toEqual([
      ["dodson", "Public domain (CC0 1.0)"],
      ["elevenlabs-audio", "Generated audio, used under the ElevenLabs Terms of Service"],
      ["morphgnt-sblgnt", "CC BY-SA 3.0"],
      ["sblgnt", "CC BY 4.0"],
    ]);
    for (const r of rows) expect(r.attribution.length).toBeGreaterThan(20);
  });
});
