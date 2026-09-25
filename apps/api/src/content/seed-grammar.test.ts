import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GRAMMAR_BOOKS, importBooks, testApp } from "../../test/fixtures";
import { grammarConceptExamples, grammarConceptRules, grammarConcepts } from "../db/schema";
import { getTokenDetail } from "../reading/queries";
import { grammarContent } from "./grammar";
import type { GrammarConceptContent } from "./grammar/types";
import { seedGrammar } from "./seed-grammar";

const { db, close } = testApp();
beforeAll(() => importBooks(db, GRAMMAR_BOOKS), 120_000);
afterAll(close);

const tiny = (over: Partial<GrammarConceptContent> = {}): GrammarConceptContent => ({
  slug: "tiny",
  title: "Tiny",
  summarySimple: "s",
  body: "b",
  examples: [{ ref: "JHN 1:1", word: "λόγος" }],
  rules: [{ match: { case: "vocative" }, note: "n" }],
  ...over,
});

describe("seedGrammar", { timeout: 60_000 }, () => {
  it("seeds the whole curriculum, resolving every example to a real token", async () => {
    await db.execute(sql`truncate grammar_concepts restart identity cascade`);
    expect(await seedGrammar(db, grammarContent)).toBe(grammarContent.length);
    const [slice] = await db
      .select()
      .from(grammarConcepts)
      .where(eq(grammarConcepts.slug, "article-and-case"));
    const examples = await db
      .select()
      .from(grammarConceptExamples)
      .where(eq(grammarConceptExamples.conceptId, slice!.id));
    expect(examples).toHaveLength(7);
  });

  it("is idempotent: ids, rules and examples are stable across runs", async () => {
    await seedGrammar(db, grammarContent);
    const snapshot = async () =>
      db.execute(sql`
        select c.id, c.slug, c.curriculum_order,
          (select count(*) from grammar_concept_rules r where r.concept_id = c.id) as rules,
          (select string_agg(token_id::text, ',' order by position) from grammar_concept_examples e
            where e.concept_id = c.id) as examples
        from grammar_concepts c order by c.id`);
    const before = await snapshot();
    await seedGrammar(db, grammarContent);
    expect(await snapshot()).toEqual(before);
  });

  it("reorders without tripping the unique curriculum order", async () => {
    const reversed = [...grammarContent].reverse();
    await seedGrammar(db, reversed);
    const [first] = await db
      .select({ slug: grammarConcepts.slug })
      .from(grammarConcepts)
      .where(eq(grammarConcepts.curriculumOrder, 1));
    expect(first?.slug).toBe(reversed[0]!.slug);
    await seedGrammar(db, grammarContent);
  });

  it("fails loudly, writing nothing, when an example is not in its verse", async () => {
    const bad = [...grammarContent, tiny({ examples: [{ ref: "JHN 1:1", word: "κόσμος" }] })];
    await expect(seedGrammar(db, bad)).rejects.toThrow(/"κόσμος" \(#1\) not found in JHN 1:1/);
    expect(await db.$count(grammarConcepts, eq(grammarConcepts.slug, "tiny"))).toBe(0);
  });

  it("rejects invalid matchers and duplicate slugs", async () => {
    await expect(
      seedGrammar(db, [
        ...grammarContent,
        tiny({ rules: [{ match: { case: "ablative" } as never, note: "n" }] }),
      ]),
    ).rejects.toThrow(/invalid matcher/);
    await expect(seedGrammar(db, [...grammarContent, grammarContent[0]!])).rejects.toThrow(
      /Duplicate slug/,
    );
  });

  it("refuses to leave concepts in the DB that the content no longer has", async () => {
    await expect(seedGrammar(db, grammarContent.slice(1))).rejects.toThrow(
      /in the DB but not in the content: alphabet/,
    );
  });
});

describe("curated notes in the reader", { timeout: 60_000 }, () => {
  beforeAll(() => seedGrammar(db, grammarContent));

  async function notesFor(ref: string) {
    const rows = await db.execute<{ id: number; word: string }>(sql`
      select t.id, t.word from tokens t join verses v on v.id = t.verse_id
      where v.ref = ${ref} order by t.position`);
    return Promise.all(
      rows.map(async (r) => ({
        word: r.word,
        slugs: (await getTokenDetail(db, r.id))!.concepts.map((c) => c.slug),
      })),
    );
  }

  it("gives every word of John 1:1–5 at least one note", async () => {
    for (const verse of [1, 2, 3, 4, 5]) {
      for (const { word, slugs } of await notesFor(`JHN 1:${verse}`)) {
        expect(slugs.length, `JHN 1:${verse} ${word}`).toBeGreaterThan(0);
      }
    }
  });

  it("puts the most specific note first", async () => {
    const john11 = await notesFor("JHN 1:1");
    expect(john11.find((t) => t.word === "ἦν")?.slugs[0]).toBe("eimi");
    expect(john11.find((t) => t.word === "τὸν")?.slugs[0]).toBe("article-and-case");
    const john13 = await notesFor("JHN 1:3");
    expect(john13.find((t) => t.word === "αὐτοῦ")?.slugs).toEqual([
      "personal-pronouns",
      "genitive",
    ]);
    const rules = await db.select().from(grammarConceptRules);
    expect(rules.every((r) => r.note && r.note.length > 0)).toBe(true);
  });
});
