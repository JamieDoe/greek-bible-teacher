import type { SrsState } from "@gbt/shared";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { userWordProgress } from "../db/schema";

export type WordProgressRow = typeof userWordProgress.$inferSelect;

/** The scheduler's view of a progress row, or null if the word has never been graded. */
export function toSrsState(row: WordProgressRow | undefined | null): SrsState | null {
  if (
    !row ||
    row.nextReviewAt === null ||
    row.lastReviewedAt === null ||
    row.difficulty === null ||
    row.stability === null ||
    row.intervalDays === null
  ) {
    return null;
  }
  return {
    difficulty: row.difficulty,
    stability: row.stability,
    intervalDays: row.intervalDays,
    nextReviewAt: row.nextReviewAt,
    lastReviewedAt: row.lastReviewedAt,
  };
}

export async function findWordProgress(
  db: Pick<Db, "select">,
  userId: string,
  lemmaId: number,
): Promise<WordProgressRow | undefined> {
  const [row] = await db
    .select()
    .from(userWordProgress)
    .where(and(eq(userWordProgress.userId, userId), eq(userWordProgress.lemmaId, lemmaId)));
  return row;
}
