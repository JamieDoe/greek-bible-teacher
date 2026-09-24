import { sm2Scheduler as scheduler } from "@gbt/shared";
import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../db/client";
import {
  passages,
  readingEvents,
  tokens,
  userReadingProgress,
  userWordProgress,
  verses,
} from "../db/schema";
import { findWordProgress, toSrsState } from "../review/progress";

const startVerse = alias(verses, "start_verse");
const endVerse = alias(verses, "end_verse");

/** The token's lemma if the token lies inside the passage, else null. */
export async function lemmaOfTokenInPassage(db: Db, passageId: number, tokenId: number) {
  const [row] = await db
    .select({ lemmaId: tokens.lemmaId })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(passages, eq(passages.id, passageId))
    .innerJoin(startVerse, eq(startVerse.id, passages.startVerseId))
    .innerJoin(endVerse, eq(endVerse.id, passages.endVerseId))
    .where(
      and(
        eq(tokens.id, tokenId),
        sql`${verses.ordinal} between ${startVerse.ordinal} and ${endVerse.ordinal}`,
      ),
    );
  return row?.lemmaId ?? null;
}

export async function passageExists(db: Db, passageId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: passages.id })
    .from(passages)
    .where(eq(passages.id, passageId));
  return row !== undefined;
}

/**
 * Records a lookup while reading: counts it for the word and the passage and, if the word is
 * already on a review schedule, brings its next review earlier (a weak signal, not a failure).
 */
export async function recordLookup(
  db: Db,
  {
    userId,
    passageId,
    lemmaId,
    now,
  }: { userId: string; passageId: number; lemmaId: number; now: Date },
) {
  await db.transaction(async (tx) => {
    const existing = await findWordProgress(tx, userId, lemmaId);
    const state = toSrsState(existing);
    const nudgedDue = state ? scheduler.nudgeForLookup(state, now) : null;

    await tx
      .insert(userWordProgress)
      .values({ userId, lemmaId, lookupsCount: 1, firstSeenAt: now })
      .onConflictDoUpdate({
        target: [userWordProgress.userId, userWordProgress.lemmaId],
        set: {
          lookupsCount: sql`${userWordProgress.lookupsCount} + 1`,
          ...(nudgedDue ? { nextReviewAt: nudgedDue } : {}),
        },
      });

    await tx
      .insert(userReadingProgress)
      .values({ userId, passageId, tokensLookedUp: 1, lastReadAt: now })
      .onConflictDoUpdate({
        target: [userReadingProgress.userId, userReadingProgress.passageId],
        set: {
          tokensLookedUp: sql`${userReadingProgress.tokensLookedUp} + 1`,
          lastReadAt: now,
        },
      });
  });
}

/** Greek tokens in a passage. */
async function passageTokenCount(db: Pick<Db, "select">, passageId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(passages, eq(passages.id, passageId))
    .innerJoin(startVerse, eq(startVerse.id, passages.startVerseId))
    .innerJoin(endVerse, eq(endVerse.id, passages.endVerseId))
    .where(sql`${verses.ordinal} between ${startVerse.ordinal} and ${endVerse.ordinal}`);
  return row?.n ?? 0;
}

/**
 * Marks a read-through as finished: bumps the passage's progress (keeping the first
 * completion date) and appends a reading event for activity over time.
 */
export async function recordCompletion(
  db: Db,
  { userId, passageId, now }: { userId: string; passageId: number; now: Date },
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(userReadingProgress)
      .values({ userId, passageId, timesRead: 1, completedAt: now, lastReadAt: now })
      .onConflictDoUpdate({
        target: [userReadingProgress.userId, userReadingProgress.passageId],
        set: {
          timesRead: sql`${userReadingProgress.timesRead} + 1`,
          completedAt: sql`coalesce(${userReadingProgress.completedAt}, ${now.toISOString()}::timestamptz)`,
          lastReadAt: now,
        },
      })
      .returning({
        timesRead: userReadingProgress.timesRead,
        completedAt: userReadingProgress.completedAt,
      });
    await tx.insert(readingEvents).values({
      userId,
      passageId,
      completedAt: now,
      tokensRead: await passageTokenCount(tx, passageId),
    });
    return row!;
  });
}
