import type { LessonResponse, LessonStep } from "@gbt/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../db/client";
import {
  grammarConceptRules,
  grammarConcepts,
  lemmas,
  lessonItems,
  lessons,
  morphology,
  passages,
  tokens,
  userLessonProgress,
  verses,
} from "../db/schema";
import { ruleMatchesToken, ruleSpecificity } from "../grammar/matching";
import { verseSnippet } from "../reading/verse-snippet";

type Item = typeof lessonItems.$inferSelect;
type Concept = { id: number; slug: string; title: string };

/**
 * Turns stored lesson items into the daily loop: first review → review due; vocab items →
 * one vocabulary step; grammar → grammar; first reading → guided reading, then investigating
 * the forms that show the concept; second review → recall; second reading → re-read.
 */
export function lessonSteps(
  items: Item[],
  concept: Concept | null,
  investigation: Extract<LessonStep, { kind: "investigate" }>["verses"],
): LessonStep[] {
  const steps: LessonStep[] = [];
  const vocab = items.filter((i) => i.kind === "vocab").map((i) => i.lemmaId!);
  let reviews = 0;
  let readings = 0;
  for (const item of items) {
    switch (item.kind) {
      case "review":
        steps.push(
          reviews++ === 0 ? { kind: "review_due" } : { kind: "review_recall", lemmaIds: vocab },
        );
        break;
      case "vocab":
        if (steps.at(-1)?.kind !== "vocab") steps.push({ kind: "vocab", lemmaIds: vocab });
        break;
      case "grammar":
        if (concept) steps.push({ kind: "grammar", slug: concept.slug, title: concept.title });
        break;
      case "reading":
        if (readings++ === 0) {
          steps.push({ kind: "reading", passageId: item.passageId! });
          if (concept && investigation.length > 0) {
            steps.push({
              kind: "investigate",
              conceptSlug: concept.slug,
              conceptTitle: concept.title,
              verses: investigation,
            });
          }
        } else {
          steps.push({ kind: "reread", passageId: item.passageId! });
        }
        break;
    }
  }
  return steps;
}

const startVerse = alias(verses, "start_verse");
const endVerse = alias(verses, "end_verse");

/** Tokens of the passage matching the concept's rules, grouped by verse, with their notes. */
async function investigate(db: Db, conceptId: number, startOrdinal: number, endOrdinal: number) {
  const matches = await db
    .select({
      tokenId: tokens.id,
      verseId: tokens.verseId,
      word: tokens.word,
      note: grammarConceptRules.note,
    })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(lemmas, eq(lemmas.id, tokens.lemmaId))
    .innerJoin(morphology, eq(morphology.id, tokens.morphologyId))
    .innerJoin(
      grammarConceptRules,
      and(eq(grammarConceptRules.conceptId, conceptId), ruleMatchesToken),
    )
    .where(sql`${verses.ordinal} between ${startOrdinal} and ${endOrdinal}`)
    .orderBy(asc(verses.ordinal), asc(tokens.position), ...ruleSpecificity);

  // One note per token (its most specific rule), grouped by verse in reading order.
  const byVerse = new Map<
    number,
    { tokenIds: Set<number>; notes: { word: string; note: string }[] }
  >();
  for (const m of matches) {
    const verse = byVerse.get(m.verseId) ?? { tokenIds: new Set(), notes: [] };
    byVerse.set(m.verseId, verse);
    if (verse.tokenIds.has(m.tokenId)) continue;
    verse.tokenIds.add(m.tokenId);
    if (m.note && !verse.notes.some((n) => n.word === m.word && n.note === m.note)) {
      verse.notes.push({ word: m.word, note: m.note });
    }
  }
  return Promise.all(
    [...byVerse.entries()].map(async ([verseId, v]) => ({
      ...(await verseSnippet(db, verseId, v.tokenIds)),
      notes: v.notes,
    })),
  );
}

export async function getLesson(
  db: Db,
  id: number,
  userId: string,
): Promise<LessonResponse["lesson"] | null> {
  const [lesson] = await db
    .select({
      id: lessons.id,
      number: lessons.curriculumOrder,
      title: lessons.title,
      passageId: passages.id,
      passageTitle: passages.title,
      startOrdinal: startVerse.ordinal,
      endOrdinal: endVerse.ordinal,
    })
    .from(lessons)
    .innerJoin(passages, eq(passages.id, lessons.passageId))
    .innerJoin(startVerse, eq(startVerse.id, passages.startVerseId))
    .innerJoin(endVerse, eq(endVerse.id, passages.endVerseId))
    .where(eq(lessons.id, id));
  if (!lesson) return null;

  const items = await db
    .select()
    .from(lessonItems)
    .where(eq(lessonItems.lessonId, id))
    .orderBy(asc(lessonItems.position));
  const grammarItem = items.find((i) => i.kind === "grammar");
  const [concept] = grammarItem
    ? await db
        .select({
          id: grammarConcepts.id,
          slug: grammarConcepts.slug,
          title: grammarConcepts.title,
        })
        .from(grammarConcepts)
        .where(eq(grammarConcepts.id, grammarItem.conceptId!))
    : [];
  const investigation = concept
    ? await investigate(db, concept.id, lesson.startOrdinal, lesson.endOrdinal)
    : [];

  const [progress] = await db
    .select({
      currentStep: userLessonProgress.currentStep,
      completedAt: userLessonProgress.completedAt,
    })
    .from(userLessonProgress)
    .where(and(eq(userLessonProgress.userId, userId), eq(userLessonProgress.lessonId, id)));

  return {
    id: lesson.id,
    number: lesson.number,
    title: lesson.title,
    passage: { id: lesson.passageId, title: lesson.passageTitle },
    steps: lessonSteps(items, concept ?? null, investigation),
    progress: progress
      ? {
          currentStep: progress.currentStep,
          completedAt: progress.completedAt?.toISOString() ?? null,
        }
      : null,
  };
}

/** Saves the learner's place. Completion is kept once reached; the step can move either way. */
export async function recordLessonProgress(
  db: Db,
  {
    userId,
    lessonId,
    step,
    completed,
    now,
  }: { userId: string; lessonId: number; step: number; completed: boolean; now: Date },
) {
  const completedAt = completed ? now : null;
  const [row] = await db
    .insert(userLessonProgress)
    .values({ userId, lessonId, currentStep: step, startedAt: now, completedAt })
    .onConflictDoUpdate({
      target: [userLessonProgress.userId, userLessonProgress.lessonId],
      set: {
        currentStep: step,
        completedAt: sql`coalesce(${userLessonProgress.completedAt}, excluded.completed_at)`,
      },
    })
    .returning({
      currentStep: userLessonProgress.currentStep,
      completedAt: userLessonProgress.completedAt,
    });
  return row!;
}

/** Every lesson in order, with the learner's status. */
export async function listLessons(db: Db, userId: string) {
  const rows = await db
    .select({
      id: lessons.id,
      number: lessons.curriculumOrder,
      title: lessons.title,
      passageTitle: passages.title,
      conceptTitle: grammarConcepts.title,
      completedAt: userLessonProgress.completedAt,
      startedAt: userLessonProgress.startedAt,
    })
    .from(lessons)
    .innerJoin(passages, eq(passages.id, lessons.passageId))
    .leftJoin(
      lessonItems,
      and(eq(lessonItems.lessonId, lessons.id), eq(lessonItems.kind, "grammar")),
    )
    .leftJoin(grammarConcepts, eq(grammarConcepts.id, lessonItems.conceptId))
    .leftJoin(
      userLessonProgress,
      and(eq(userLessonProgress.lessonId, lessons.id), eq(userLessonProgress.userId, userId)),
    )
    .orderBy(asc(lessons.curriculumOrder));
  return rows.map(({ completedAt, startedAt, ...r }) => ({
    ...r,
    status: completedAt
      ? ("completed" as const)
      : startedAt
        ? ("in_progress" as const)
        : ("not_started" as const),
  }));
}
