import {
  type ReviewContext,
  type ReviewGrade,
  sm2Scheduler as scheduler,
  type SrsState,
} from "@gbt/shared";
import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { lemmas, reviewEvents, userWordProgress } from "../db/schema";
import { notFound } from "../http/errors";
import { findWordProgress, toSrsState } from "./progress";

/**
 * Applies one graded review: runs the scheduler, updates the word's progress and appends to
 * the review log, atomically. "again" counts as incorrect; every other grade as correct.
 */
export async function gradeWord(
  db: Db,
  input: { userId: string; lemmaId: number; grade: ReviewGrade; context: ReviewContext; now: Date },
): Promise<SrsState> {
  const { userId, lemmaId, grade, context, now } = input;
  return db.transaction(async (tx) => {
    const [lemma] = await tx.select({ id: lemmas.id }).from(lemmas).where(eq(lemmas.id, lemmaId));
    if (!lemma) throw notFound("Word");

    const previous = toSrsState(await findWordProgress(tx, userId, lemmaId));
    const next = scheduler.review(previous, grade, now);
    const correct = grade === "again" ? 0 : 1;

    await tx
      .insert(userWordProgress)
      .values({
        userId,
        lemmaId,
        ...next,
        correctCount: correct,
        incorrectCount: 1 - correct,
        firstSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [userWordProgress.userId, userWordProgress.lemmaId],
        set: {
          ...next,
          correctCount: sql`${userWordProgress.correctCount} + ${correct}`,
          incorrectCount: sql`${userWordProgress.incorrectCount} + ${1 - correct}`,
        },
      });
    await tx.insert(reviewEvents).values({ userId, lemmaId, grade, context, reviewedAt: now });
    return next;
  });
}

/**
 * Puts a word into review now (from the reader's "Add to review"). A word already scheduled
 * keeps its schedule; nothing is graded, so the scheduler still treats it as new.
 */
export async function addToReview(
  db: Db,
  { userId, lemmaId, now }: { userId: string; lemmaId: number; now: Date },
): Promise<{ nextReviewAt: Date; added: boolean }> {
  const [lemma] = await db.select({ id: lemmas.id }).from(lemmas).where(eq(lemmas.id, lemmaId));
  if (!lemma) throw notFound("Word");
  const existing = await findWordProgress(db, userId, lemmaId);
  if (existing?.nextReviewAt) return { nextReviewAt: existing.nextReviewAt, added: false };
  await db
    .insert(userWordProgress)
    .values({ userId, lemmaId, nextReviewAt: now, firstSeenAt: now })
    .onConflictDoUpdate({
      target: [userWordProgress.userId, userWordProgress.lemmaId],
      set: { nextReviewAt: now },
    });
  return { nextReviewAt: now, added: true };
}
