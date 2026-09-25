import { LEARNED_INTERVAL_DAYS, type ProgressResponse } from "@gbt/shared";
import { and, count, desc, eq, gte, isNotNull, lt, ne, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  lemmas,
  readingEvents,
  reviewEvents,
  userGrammarProgress,
  userReadingProgress,
  userWordProgress,
} from "../db/schema";
import { practiceDays } from "./practice";

/** The design's milestone: every word used this many times or more in the NT. */
export const MILESTONE_FREQUENCY = 50;

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

  const [milestone] = await db.execute<{ total: number; learned: number }>(sql`
    select count(*)::int as total,
      count(p.lemma_id) filter (where p.interval_days >= ${LEARNED_INTERVAL_DAYS})::int as learned
    from ${lemmas} l
    left join ${userWordProgress} p on p.lemma_id = l.id and p.user_id = ${userId}
    where l.nt_frequency >= ${MILESTONE_FREQUENCY}`);
  const recentlyLearned = await db
    .select({ lemma: lemmas.lemma, gloss: lemmas.gloss })
    .from(userWordProgress)
    .innerJoin(lemmas, eq(lemmas.id, userWordProgress.lemmaId))
    .where(
      and(
        eq(userWordProgress.userId, userId),
        gte(userWordProgress.intervalDays, LEARNED_INTERVAL_DAYS),
      ),
    )
    .orderBy(desc(userWordProgress.lastReviewedAt))
    .limit(12);

  return {
    words: { learned, learning, learnedThresholdDays: LEARNED_INTERVAL_DAYS },
    daysPractised: (await practiceDays(db, userId, tz)).length,
    milestone: {
      minFrequency: MILESTONE_FREQUENCY,
      total: milestone?.total ?? 0,
      learned: milestone?.learned ?? 0,
    },
    recentlyLearned,
    greekWordsRead: read?.n ?? 0,
    passagesCompleted,
    conceptsStudied,
    reviews: { total, correct: right, last7Days: { total: total7, correct: right7 } },
    activity: activity.map((a) => ({ date: a.date, wordsRead: a.words_read, reviews: a.reviews })),
  };
}
