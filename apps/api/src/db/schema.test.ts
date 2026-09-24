import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createDb } from "./client";
import {
  books,
  chapters,
  dataSources,
  grammarConceptRules,
  grammarConcepts,
  lemmas,
  lessonItems,
  lessons,
  morphology,
  tokens,
  users,
  userWordProgress,
  verses,
} from "./schema";

const { db, client } = createDb(inject("testDatabaseUrl"), { max: 1 });
afterAll(() => client.end());

beforeEach(async () => {
  await db.execute(sql`
    truncate data_sources, books, chapters, verses, tokens, lemmas, morphology,
      grammar_concepts, grammar_concept_rules, lessons, lesson_items, users
    restart identity cascade`);
});

/** Asserts the query fails because of the named DB constraint. */
async function expectViolation(query: PromiseLike<unknown>, constraint: string) {
  const err: unknown = await Promise.resolve(query).then(
    () => null,
    (e: unknown) => e,
  );
  expect(err, `expected ${constraint} to reject the write`).not.toBeNull();
  const pgError = (err as { cause?: { constraint_name?: string } }).cause;
  expect(pgError?.constraint_name).toBe(constraint);
}

async function seedVerseWithToken() {
  const [source] = await db
    .insert(dataSources)
    .values({ key: "test", name: "Test", licence: "test", attribution: "test" })
    .returning();
  const [book] = await db
    .insert(books)
    .values({ name: "John", abbrev: "JHN", canonicalOrder: 4, testament: "NT" })
    .returning();
  const [chapter] = await db.insert(chapters).values({ bookId: book!.id, number: 1 }).returning();
  const [verse] = await db
    .insert(verses)
    .values({ chapterId: chapter!.id, number: 1, ref: "JHN 1:1", ordinal: 1 })
    .returning();
  const [lemma] = await db.insert(lemmas).values({ lemma: "λόγος" }).returning();
  const [morph] = await db
    .insert(morphology)
    .values({
      posCode: "N-",
      parseCode: "----NSM-",
      partOfSpeech: "noun",
      case: "nominative",
      number: "singular",
      gender: "masculine",
    })
    .returning();
  const token = {
    verseId: verse!.id,
    position: 1,
    surface: "λόγος,",
    word: "λόγος",
    normalized: "λόγος",
    lemmaId: lemma!.id,
    morphologyId: morph!.id,
    sourceId: source!.id,
  };
  await db.insert(tokens).values(token);
  return { token, lemma: lemma!, source: source! };
}

describe("text + lexicon constraints", () => {
  it("rejects a second token at the same verse position", async () => {
    const { token } = await seedVerseWithToken();
    await expectViolation(db.insert(tokens).values(token), "tokens_verse_position_unique");
  });

  it("rejects malformed parse codes", async () => {
    await expectViolation(
      db.insert(morphology).values({ posCode: "N-", parseCode: "NSM", partOfSpeech: "noun" }),
      "morphology_parse_code_len",
    );
  });

  it("requires a source for any gloss", async () => {
    await expectViolation(
      db.insert(lemmas).values({ lemma: "θεός", gloss: "God" }),
      "lemmas_gloss_has_source",
    );
  });
});

describe("curriculum constraints", () => {
  async function seedLesson() {
    const [lesson] = await db
      .insert(lessons)
      .values({ curriculumOrder: 1, title: "L1" })
      .returning();
    return lesson!.id;
  }

  it("requires a vocab item to point at a lemma and nothing else", async () => {
    const lessonId = await seedLesson();
    await expectViolation(
      db.insert(lessonItems).values({ lessonId, position: 1, kind: "vocab" }),
      "lesson_items_target_matches_kind",
    );
  });

  it("rejects targets on a review item", async () => {
    const { lemma } = await seedVerseWithToken();
    const lessonId = await seedLesson();
    await expectViolation(
      db.insert(lessonItems).values({ lessonId, position: 1, kind: "review", lemmaId: lemma.id }),
      "lesson_items_target_matches_kind",
    );
  });

  it("accepts well-formed items", async () => {
    const { lemma } = await seedVerseWithToken();
    const lessonId = await seedLesson();
    await db.insert(lessonItems).values([
      { lessonId, position: 1, kind: "review" },
      { lessonId, position: 2, kind: "vocab", lemmaId: lemma.id },
    ]);
    expect(await db.$count(lessonItems)).toBe(2);
  });

  it("rejects an empty rule matcher", async () => {
    const [concept] = await db
      .insert(grammarConcepts)
      .values({ slug: "article", curriculumOrder: 1, title: "t", summarySimple: "s", body: "b" })
      .returning();
    await expectViolation(
      db.insert(grammarConceptRules).values({ conceptId: concept!.id, match: {} }),
      "grammar_concept_rules_match_nonempty_object",
    );
  });
});

describe("learner tables", () => {
  it("creates anonymous users with a uuid and beginner disclosure", async () => {
    const [user] = await db.insert(users).values({}).returning();
    expect(user!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user!.disclosureLevel).toBe("beginner");
  });

  it("deletes a user's progress with the user", async () => {
    const { lemma } = await seedVerseWithToken();
    const [user] = await db.insert(users).values({}).returning();
    await db.insert(userWordProgress).values({ userId: user!.id, lemmaId: lemma.id });
    await db.delete(users).where(eq(users.id, user!.id));
    expect(await db.$count(userWordProgress)).toBe(0);
  });
});
