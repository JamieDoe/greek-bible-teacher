import type { TodayResponse } from "@gbt/shared";
import { and, asc, count, desc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  grammarConcepts,
  lessonItems,
  lessons,
  passages,
  userGrammarProgress,
  userLessonProgress,
  userReadingProgress,
  users,
  userWordProgress,
} from "../db/schema";
import { getLesson } from "../lessons/queries";

/** Everything the Today screen needs in one request. */
export async function getToday(db: Db, userId: string, now: Date): Promise<TodayResponse> {
  const [user] = await db
    .select({ onboardedAt: users.onboardedAt, dailyMinutes: users.dailyMinutes })
    .from(users)
    .where(eq(users.id, userId));

  const countWhere = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
  const [dueCount, wordsInReview, passagesCompleted, conceptsStudied, lessonsCompleted] =
    await Promise.all([
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
          .where(
            and(eq(userWordProgress.userId, userId), isNotNull(userWordProgress.nextReviewAt)),
          ),
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
    ]);

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
    lesson,
    lastCompleted: lastCompleted
      ? { ...lastCompleted, completedAt: lastCompleted.completedAt!.toISOString() }
      : null,
    concept,
    passage: next ? { id: next.passageId, title: next.passageTitle } : null,
    progress: { wordsInReview, passagesCompleted, conceptsStudied, lessonsCompleted },
  };
}
