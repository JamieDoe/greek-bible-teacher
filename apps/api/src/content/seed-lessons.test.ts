import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CORPUS_BOOKS, importBooks, testApp } from "../../test/fixtures";
import { dataSources, lemmas, lessons, passages, tokens, verses } from "../db/schema";
import { curatedGlosses } from "./glosses";
import { grammarContent } from "./grammar";
import { lessonContent } from "./lessons";
import { passageContent } from "./passages";
import { seedPassages } from "./seed";
import { seedGrammar } from "./seed-grammar";
import { seedLessons } from "./seed-lessons";

const { db, close } = testApp();
beforeAll(async () => {
  await importBooks(db, CORPUS_BOOKS);
  await seedGrammar(db, grammarContent);
  await seedLessons(db, lessonContent);
}, 120_000);
afterAll(close);

const lessonVocab = () =>
  db.execute<{ n: number; lemmas: string[] }>(sql`
    select l.curriculum_order as n, array_agg(le.lemma order by it.position) as lemmas
    from lessons l join lesson_items it on it.lesson_id = l.id join lemmas le on le.id = it.lemma_id
    group by l.curriculum_order order by 1`);

describe("seedLessons", { timeout: 60_000 }, () => {
  it("pairs one passage with each grammar concept, from the article on, in curriculum order", () => {
    const slugs = grammarContent.map((c) => c.slug);
    // The alphabet and breathings come before any reading.
    expect(lessonContent.map((l) => l.concept)).toEqual(
      slugs.slice(slugs.indexOf("article-and-case")),
    );
    expect(lessonContent.map((l) => l.passage)).toEqual(passageContent.map((p) => p.startRef));
  });

  it("gives lesson 1 the specified slice vocabulary and later lessons fresh, frequent words", async () => {
    const vocab = await lessonVocab();
    expect(vocab[0]).toEqual({ n: 1, lemmas: ["λόγος", "θεός", "ἀρχή", "καί", "εἰμί"] });
    const seen = new Set<string>();
    for (const { lemmas: words } of vocab) {
      expect(words.length).toBeGreaterThan(0);
      for (const w of words) {
        expect(seen.has(w), `${w} repeated`).toBe(false);
        seen.add(w);
      }
      expect(words).not.toContain("ὁ");
    }
  });

  it("stores a difficulty score for every curated passage", async () => {
    const rows = await db.select({ score: passages.difficultyScore }).from(passages);
    expect(rows).toHaveLength(passageContent.length);
    for (const r of rows) {
      expect(r.score).toBeGreaterThan(0);
      expect(r.score).toBeLessThan(100);
    }
  });

  it("records curated glosses for the slice words under the curated source", async () => {
    const [row] = await db
      .select({ gloss: lemmas.gloss, key: dataSources.key })
      .from(lemmas)
      .innerJoin(dataSources, eq(dataSources.id, lemmas.glossSourceId))
      .where(eq(lemmas.lemma, "λόγος"));
    expect(row).toEqual({ gloss: "word, message", key: "curated" });
  });

  it("glosses exactly the words of the curated passages, all in the house style", async () => {
    const rows = await db.execute<{
      lemma: string;
      pos: string | null;
      gloss: string;
      key: string;
    }>(sql`
      select distinct le.lemma, le.part_of_speech::text as pos, le.gloss, ds.key
      from ${passages} p
      join ${verses} sv on sv.id = p.start_verse_id
      join ${verses} ev on ev.id = p.end_verse_id
      join ${verses} v on v.ordinal between sv.ordinal and ev.ordinal
      join ${tokens} t on t.verse_id = v.id
      join ${lemmas} le on le.id = t.lemma_id
      left join ${dataSources} ds on ds.id = le.gloss_source_id
      where p.curriculum_order is not null`);
    // No gloss is missing, and none is for a word the passages don't use.
    expect(rows.map((r) => r.lemma).sort()).toEqual(
      Object.keys(curatedGlosses)
        .map((l) => l.normalize("NFC"))
        .sort(),
    );
    for (const r of rows) {
      expect(r.key, r.lemma).toBe("curated");
      expect(
        r.gloss.length,
        `${r.lemma}: "${r.gloss}" is too long for an answer button`,
      ).toBeLessThanOrEqual(30);
      expect(r.gloss, r.lemma).not.toMatch(/^(a|an|I) /);
      if (r.pos === "verb") expect(r.gloss, r.lemma).toMatch(/^to /);
    }
  });

  it("is idempotent: lesson ids, items and scores are unchanged by a re-run", async () => {
    const snapshot = () =>
      db.execute(sql`
        select l.id, l.curriculum_order, l.passage_id, p.difficulty_score,
          (select string_agg(kind || ':' || coalesce(lemma_id, concept_id, passage_id, 0), ',' order by position)
             from lesson_items where lesson_id = l.id) as items
        from lessons l join passages p on p.id = l.passage_id order by l.id`);
    const before = await snapshot();
    await seedPassages(db, passageContent);
    await seedGrammar(db, grammarContent);
    await seedLessons(db, lessonContent);
    expect(await snapshot()).toEqual(before);
    expect(await db.$count(lessons)).toBe(lessonContent.length);
  });

  it("rejects vocabulary that is not in the lesson's passage", async () => {
    const bad = [{ ...lessonContent[0]!, vocab: ["λόγος", "κόσμος"] }, ...lessonContent.slice(1)];
    await expect(seedLessons(db, bad)).rejects.toThrow(/must occur in its passage/);
  });
});
