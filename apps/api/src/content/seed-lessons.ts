import { passageDifficulty } from "@gbt/shared";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db, DbOrTx } from "../db/client";
import {
  dataSources,
  grammarConceptRules,
  grammarConcepts,
  lemmas,
  lessonItems,
  lessons,
  morphology,
  passageRequiredConcepts,
  passages,
  tokens,
  verses,
} from "../db/schema";
import { ruleMatchesToken } from "../grammar/matching";
import { IngestError } from "../ingest/errors";
import { curatedGlosses } from "./glosses";
import { type LessonContent, VOCAB_PER_LESSON } from "./lessons";

const startVerse = alias(verses, "start_verse");
const endVerse = alias(verses, "end_verse");

async function passageRows(db: Db) {
  return db
    .select({
      id: passages.id,
      startRef: startVerse.ref,
      startOrdinal: startVerse.ordinal,
      endOrdinal: endVerse.ordinal,
      curriculumOrder: passages.curriculumOrder,
    })
    .from(passages)
    .innerJoin(startVerse, eq(startVerse.id, passages.startVerseId))
    .innerJoin(endVerse, eq(endVerse.id, passages.endVerseId))
    .where(isNotNull(passages.curriculumOrder))
    .orderBy(asc(passages.curriculumOrder));
}

/** Lemma ids of a passage's tokens, most frequent first (ties by id), excluding the article. */
async function passageLemmas(db: DbOrTx, startOrdinal: number, endOrdinal: number) {
  return db
    .selectDistinct({ id: lemmas.id, lemma: lemmas.lemma, ntFrequency: lemmas.ntFrequency })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(lemmas, eq(lemmas.id, tokens.lemmaId))
    .where(
      and(
        sql`${verses.ordinal} between ${startOrdinal} and ${endOrdinal}`,
        isNotNull(lemmas.gloss),
        sql`${lemmas.partOfSpeech} is distinct from 'article'`,
      ),
    )
    .orderBy(sql`${lemmas.ntFrequency} desc`, asc(lemmas.id));
}

/**
 * Seeds lessons and their items, each passage's required concepts and difficulty score, and
 * the curated glosses. Run after passages and grammar are seeded. Idempotent.
 */
export async function seedLessons(db: Db, content: LessonContent[]): Promise<number> {
  const allPassages = await passageRows(db);
  const passageByStart = new Map(allPassages.map((p) => [p.startRef, p]));
  const concepts = await db
    .select({
      id: grammarConcepts.id,
      slug: grammarConcepts.slug,
      order: grammarConcepts.curriculumOrder,
    })
    .from(grammarConcepts);
  const conceptBySlug = new Map(concepts.map((c) => [c.slug, c]));
  const conceptOrderById = new Map(concepts.map((c) => [c.id, c.order]));

  return db.transaction(async (tx) => {
    // Curated glosses for every word in the curated passages
    const [curated] = await tx
      .insert(dataSources)
      .values({
        key: "curated",
        name: "Greek Bible Teacher (curated)",
        licence: "Project content",
        attribution: "Hand-written glosses and grammar lessons by the Greek Bible Teacher project.",
      })
      .onConflictDoUpdate({ target: dataSources.key, set: { name: sql`excluded.name` } })
      .returning({ id: dataSources.id });
    for (const [lemma, gloss] of Object.entries(curatedGlosses)) {
      const updated = await tx
        .update(lemmas)
        .set({ gloss, glossSourceId: curated!.id })
        .where(eq(lemmas.lemma, lemma.normalize("NFC")))
        .returning({ id: lemmas.id });
      if (updated.length !== 1) throw new IngestError(`Curated gloss: lemma "${lemma}" not found`);
    }

    // Required concepts: any concept with a rule matching a token in the passage
    for (const p of allPassages) {
      const required = await tx
        .selectDistinct({ conceptId: grammarConceptRules.conceptId })
        .from(tokens)
        .innerJoin(verses, eq(verses.id, tokens.verseId))
        .innerJoin(lemmas, eq(lemmas.id, tokens.lemmaId))
        .innerJoin(morphology, eq(morphology.id, tokens.morphologyId))
        .innerJoin(grammarConceptRules, ruleMatchesToken)
        .where(sql`${verses.ordinal} between ${p.startOrdinal} and ${p.endOrdinal}`);
      await tx.delete(passageRequiredConcepts).where(eq(passageRequiredConcepts.passageId, p.id));
      if (required.length > 0) {
        await tx
          .insert(passageRequiredConcepts)
          .values(required.map((r) => ({ passageId: p.id, conceptId: r.conceptId })));
      }
    }

    // Lessons, in order; lesson numbers are rewritten after a temporary offset
    await tx.update(lessons).set({ curriculumOrder: sql`${lessons.curriculumOrder} + 100000` });
    const taught = new Set<number>();
    for (const [i, lesson] of content.entries()) {
      const passage = passageByStart.get(lesson.passage);
      if (!passage)
        throw new IngestError(`Lesson "${lesson.title}": passage ${lesson.passage} not seeded`);
      const concept = conceptBySlug.get(lesson.concept);
      if (!concept)
        throw new IngestError(`Lesson "${lesson.title}": concept ${lesson.concept} not found`);

      const available = await passageLemmas(tx, passage.startOrdinal, passage.endOrdinal);
      let vocabIds: number[];
      if (lesson.vocab) {
        const rows = await tx
          .select({ id: lemmas.id, lemma: lemmas.lemma })
          .from(lemmas)
          .where(
            inArray(
              lemmas.lemma,
              lesson.vocab.map((l) => l.normalize("NFC")),
            ),
          );
        if (rows.length !== lesson.vocab.length) {
          throw new IngestError(`Lesson "${lesson.title}": vocabulary not found in lemmas`);
        }
        const byLemma = new Map(rows.map((r) => [r.lemma, r.id]));
        vocabIds = lesson.vocab.map((l) => byLemma.get(l.normalize("NFC"))!);
        const inPassage = new Set(available.map((a) => a.id));
        const outside = vocabIds.filter((id) => !inPassage.has(id));
        if (outside.length > 0) {
          throw new IngestError(`Lesson "${lesson.title}": vocabulary must occur in its passage`);
        }
      } else {
        vocabIds = available
          .filter((a) => !taught.has(a.id))
          .slice(0, VOCAB_PER_LESSON)
          .map((a) => a.id);
      }
      vocabIds.forEach((id) => taught.add(id));

      const [row] = await tx
        .insert(lessons)
        .values({ curriculumOrder: i + 1, title: lesson.title, passageId: passage.id })
        .onConflictDoUpdate({
          target: lessons.passageId,
          set: { title: lesson.title, curriculumOrder: i + 1 },
        })
        .returning({ id: lessons.id });
      const lessonId = row!.id;

      await tx.delete(lessonItems).where(eq(lessonItems.lessonId, lessonId));
      const items: (typeof lessonItems.$inferInsert)[] = [
        { lessonId, position: 0, kind: "review" }, // review what is due
        ...vocabIds.map((lemmaId) => ({ lessonId, position: 0, kind: "vocab" as const, lemmaId })),
        { lessonId, position: 0, kind: "grammar", conceptId: concept.id },
        { lessonId, position: 0, kind: "reading", passageId: passage.id }, // guided reading
        { lessonId, position: 0, kind: "review" }, // recall
        { lessonId, position: 0, kind: "reading", passageId: passage.id }, // re-read
      ];
      await tx.insert(lessonItems).values(items.map((it, n) => ({ ...it, position: n + 1 })));

      // Difficulty, with concepts taught after this lesson's concept counted as uncovered
      const ranks = await tx.execute<{ r: number }>(sql`
        with ranked as (
          select id, row_number() over (order by nt_frequency desc, id)::int as r from ${lemmas})
        select ranked.r from ${tokens} t
        join ${verses} v on v.id = t.verse_id join ranked on ranked.id = t.lemma_id
        where v.ordinal between ${passage.startOrdinal} and ${passage.endOrdinal}`);
      const [verseCount] = await tx.execute<{ n: number }>(sql`
        select count(*)::int as n from ${verses}
        where ordinal between ${passage.startOrdinal} and ${passage.endOrdinal}`);
      const required = await tx
        .select({ conceptId: passageRequiredConcepts.conceptId })
        .from(passageRequiredConcepts)
        .where(eq(passageRequiredConcepts.passageId, passage.id));
      const uncovered = required.filter(
        (r) => (conceptOrderById.get(r.conceptId) ?? 0) > concept.order,
      ).length;
      const { score } = passageDifficulty({
        tokenLemmaRanks: ranks.map((x) => x.r),
        verseCount: verseCount!.n,
        uncoveredConceptCount: uncovered,
      });
      await tx.update(passages).set({ difficultyScore: score }).where(eq(passages.id, passage.id));
    }

    const [extra] = await tx.execute<{ n: number }>(
      sql`select count(*)::int as n from ${lessons} where curriculum_order > ${content.length}`,
    );
    if ((extra?.n ?? 0) > 0) {
      throw new IngestError("Lessons exist in the DB beyond the content; remove them first");
    }
    return content.length;
  });
}
