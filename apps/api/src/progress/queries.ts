import { LEARNED_INTERVAL_DAYS, type ProgressResponse } from "@gbt/shared";
import { and, count, eq, gte, isNotNull, lt, ne, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  readingEvents,
  reviewEvents,
  userGrammarProgress,
  userReadingProgress,
  userWordProgress,
} from "../db/schema";

const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;

/** Real counts only; no proficiency percentages. `tz` must already be a valid IANA zone. */
export async function getProgress(
  db: Db,
  { userId, tz, days, now }: { userId: string; tz: string; days: number; now: Date },
): Promise<ProgressResponse> {
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const correct = ne(reviewEvents.grade, "again");
  const mine = eq(reviewEvents.userId, userId);

  const [learned, learning, passagesCompleted, conceptsStudied, total, right, total7, right7] =
    await Promise.all([
      n(
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
      n(
        db
          .select({ n: count() })
          .from(userWordProgress)
          .where(
            and(
              eq(userWordProgress.userId, userId),
              isNotNull(userWordProgress.nextReviewAt),
              lt(userWordProgress.intervalDays, LEARNED_INTERVAL_DAYS),
            ),
          ),
      ),
      n(
        db
          .select({ n: count() })
          .from(userReadingProgress)
          .where(
            and(eq(userReadingProgress.userId, userId), isNotNull(userReadingProgress.completedAt)),
          ),
      ),
      n(
        db
          .select({ n: count() })
          .from(userGrammarProgress)
          .where(
            and(eq(userGrammarProgress.userId, userId), eq(userGrammarProgress.status, "studied")),
          ),
      ),
      n(db.select({ n: count() }).from(reviewEvents).where(mine)),
      n(db.select({ n: count() }).from(reviewEvents).where(and(mine, correct))),
      n(
        db
          .select({ n: count() })
          .from(reviewEvents)
          .where(and(mine, gte(reviewEvents.reviewedAt, weekAgo))),
      ),
      n(
        db
          .select({ n: count() })
          .from(reviewEvents)
          .where(and(mine, correct, gte(reviewEvents.reviewedAt, weekAgo))),
      ),
    ]);

  const [read] = await db
    .select({ n: sql<number>`coalesce(sum(${readingEvents.tokensRead}), 0)::int` })
    .from(readingEvents)
    .where(eq(readingEvents.userId, userId));

  // Local calendar days in the learner's zone, zero-filled.
  const nowIso = now.toISOString();
  const activity = await db.execute<{ date: string; words_read: number; reviews: number }>(sql`
    with days as (
      select generate_series(
        (${nowIso}::timestamptz at time zone ${tz})::date - (${days}::int - 1),
        (${nowIso}::timestamptz at time zone ${tz})::date,
        interval '1 day')::date as d
    ),
    reads as (
      select (completed_at at time zone ${tz})::date as d, sum(tokens_read)::int as words
      from ${readingEvents} where user_id = ${userId} group by 1
    ),
    reviews as (
      select (reviewed_at at time zone ${tz})::date as d, count(*)::int as n
      from ${reviewEvents} where user_id = ${userId} group by 1
    )
    select days.d::text as date, coalesce(reads.words, 0) as words_read, coalesce(reviews.n, 0) as reviews
    from days left join reads on reads.d = days.d left join reviews on reviews.d = days.d
    order by days.d`);

  return {
    words: { learned, learning, learnedThresholdDays: LEARNED_INTERVAL_DAYS },
    greekWordsRead: read?.n ?? 0,
    passagesCompleted,
    conceptsStudied,
    reviews: { total, correct: right, last7Days: { total: total7, correct: right7 } },
    activity: activity.map((a) => ({ date: a.date, wordsRead: a.words_read, reviews: a.reviews })),
  };
}
