import { LEARNED_INTERVAL_DAYS, splitSurface, type TodayResponse } from "@gbt/shared";
import { and, asc, count, desc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  grammarConcepts,
  lemmas,
  lessonItems,
  lessons,
  passages,
  readingEvents,
  tokens,
  verses,
  userGrammarProgress,
  userLessonProgress,
  userReadingProgress,
  users,
  userWordProgress,
} from "../db/schema";
import { getLesson } from "../lessons/queries";
import { nextReviewAfter } from "../review/queue";
import { localDate, practiceDays, weekOf } from "../progress/practice";

/** Everything the Today screen needs in one request. `tz` must be a validated IANA zone. */
export async function getToday(
  db: Db,
  userId: string,
  now: Date,
  tz = "UTC",
): Promise<TodayResponse> {
  const [user] = await db
    .select({ onboardedAt: users.onboardedAt, dailyMinutes: users.dailyMinutes })
    .from(users)
    .where(eq(users.id, userId));

  const countWhere = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
  const [
    dueCount,
    wordsInReview,
    passagesCompleted,
    conceptsStudied,
    lessonsCompleted,
    wordsLearned,
  ] = await Promise.all([
    countWhere(
      db
        .select({ n: count() })
        .from(userWordProgress)
        .where(and(eq(userWordProgress.userId, userId), lte(userWordProgress.nextReviewAt, now))),
    ),
    countWhere(
      db
        .select({ n: count() })
        .from(userWordProgress)
        .where(and(eq(userWordProgress.userId, userId), isNotNull(userWordProgress.nextReviewAt))),
    ),
    countWhere(
      db
        .select({ n: count() })
        .from(userReadingProgress)
        .where(
          and(eq(userReadingProgress.userId, userId), isNotNull(userReadingProgress.completedAt)),
        ),
    ),
    countWhere(
      db
        .select({ n: count() })
        .from(userGrammarProgress)
        .where(
          and(eq(userGrammarProgress.userId, userId), eq(userGrammarProgress.status, "studied")),
        ),
    ),
    countWhere(
      db
        .select({ n: count() })
        .from(userLessonProgress)
        .where(
          and(eq(userLessonProgress.userId, userId), isNotNull(userLessonProgress.completedAt)),
        ),
    ),
    countWhere(
      db
        .select({ n: count() })
        .from(userWordProgress)
        .where(
          and(
            eq(userWordProgress.userId, userId),
            gte(userWordProgress.intervalDays, LEARNED_INTERVAL_DAYS),
          ),
        ),
    ),
  ]);
  const [read] = await db
    .select({ n: sql<number>`coalesce(sum(${readingEvents.tokensRead}), 0)::int` })
    .from(readingEvents)
    .where(eq(readingEvents.userId, userId));

  const days = new Set(await practiceDays(db, userId, tz));
  const today = localDate(now, tz);
  const week = weekOf(today).map((date) => ({
    date,
    practised: days.has(date),
    today: date === today,
  }));

  const dueWords = await db
    .select({ lemmaId: lemmas.id, lemma: lemmas.lemma, gloss: lemmas.gloss })
    .from(userWordProgress)
    .innerJoin(lemmas, eq(lemmas.id, userWordProgress.lemmaId))
    .where(and(eq(userWordProgress.userId, userId), lte(userWordProgress.nextReviewAt, now)))
    .orderBy(asc(userWordProgress.nextReviewAt))
    .limit(4);

  const [next] = await db
    .select({
      id: lessons.id,
      number: lessons.curriculumOrder,
      title: lessons.title,
      currentStep: userLessonProgress.currentStep,
      startedAt: userLessonProgress.startedAt,
      passageId: passages.id,
      passageTitle: passages.title,
    })
    .from(lessons)
    .innerJoin(passages, eq(passages.id, lessons.passageId))
    .leftJoin(
      userLessonProgress,
      and(eq(userLessonProgress.lessonId, lessons.id), eq(userLessonProgress.userId, userId)),
    )
    .where(isNull(userLessonProgress.completedAt))
    .orderBy(asc(lessons.curriculumOrder))
    .limit(1);

  const [lastCompleted] = await db
    .select({
      id: lessons.id,
      number: lessons.curriculumOrder,
      title: lessons.title,
      completedAt: userLessonProgress.completedAt,
    })
    .from(userLessonProgress)
    .innerJoin(lessons, eq(lessons.id, userLessonProgress.lessonId))
    .where(and(eq(userLessonProgress.userId, userId), isNotNull(userLessonProgress.completedAt)))
    .orderBy(desc(userLessonProgress.completedAt))
    .limit(1);

  let passageKnown: TodayResponse["passageKnown"] = null;
  if (next) {
    const tokenRows = await db.execute<{ word: string; surface: string; known: boolean }>(sql`
      select t.word, t.surface, (p.next_review_at is not null) as known
      from ${passages} ps
      join ${verses} sv on sv.id = ps.start_verse_id
      join ${verses} ev on ev.id = ps.end_verse_id
      join ${verses} v on v.ordinal between sv.ordinal and ev.ordinal
      join ${tokens} t on t.verse_id = v.id
      left join ${userWordProgress} p on p.lemma_id = t.lemma_id and p.user_id = ${userId}
      where ps.id = ${next.passageId}
      order by v.ordinal, t.position`);
    passageKnown = {
      known: tokenRows.filter((r) => r.known).length,
      total: tokenRows.length,
      // The passage's opening, with punctuation (the phone truncates it to one line).
      firstLine: tokenRows
        .slice(0, 24)
        .map((r) => {
          const { before, after } = splitSurface(r.surface, r.word);
          return before + r.word + after;
        })
        .join(" "),
    };
  }

  let lesson: TodayResponse["lesson"] = null;
  let concept: TodayResponse["concept"] = null;
  if (next) {
    const items = await db
      .select()
      .from(lessonItems)
      .where(eq(lessonItems.lessonId, next.id))
      .orderBy(asc(lessonItems.position));
    const conceptId = items.find((i) => i.kind === "grammar")?.conceptId;
    const [c] = conceptId
      ? await db
          .select({
            id: grammarConcepts.id,
            slug: grammarConcepts.slug,
            title: grammarConcepts.title,
            summarySimple: grammarConcepts.summarySimple,
          })
          .from(grammarConcepts)
          .where(eq(grammarConcepts.id, conceptId))
      : [];
    if (c) concept = { slug: c.slug, title: c.title, summarySimple: c.summarySimple };
    const stepCount = (await getLesson(db, next.id, userId))?.steps.length ?? 0;
    lesson = {
      id: next.id,
      number: next.number,
      title: next.title,
      stepCount,
      currentStep: next.currentStep ?? 0,
      started: next.startedAt !== null,
    };
  }

  return {
    onboarded: user?.onboardedAt != null,
    dailyMinutes: user?.dailyMinutes ?? null,
    dueCount,
    nextReviewAt: await nextReviewAfter(db, userId, now),
    lesson,
    lastCompleted: lastCompleted
      ? { ...lastCompleted, completedAt: lastCompleted.completedAt!.toISOString() }
      : null,
    concept,
    passage: next ? { id: next.passageId, title: next.passageTitle } : null,
    progress: {
      wordsInReview,
      passagesCompleted,
      conceptsStudied,
      lessonsCompleted,
      wordsLearned,
      greekWordsRead: read?.n ?? 0,
    },
    practice: { daysPractised: days.size, week },
    passageKnown,
    dueWords,
  };
}
