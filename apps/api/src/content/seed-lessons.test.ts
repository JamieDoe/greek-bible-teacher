import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CORPUS_BOOKS, importBooks, testApp } from "../../test/fixtures";
import { dataSources, lemmas, lessons, passages } from "../db/schema";
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
  it("has 6–12 passages beyond the slice, and one lesson per passage", () => {
    expect(passageContent.length - 1).toBeGreaterThanOrEqual(6);
    expect(passageContent.length - 1).toBeLessThanOrEqual(12);
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
