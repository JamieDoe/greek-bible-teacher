import { splitSurface } from "@gbt/shared";
import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { books, chapters, tokens, verses } from "../db/schema";

export interface VerseSnippet {
  displayRef: string;
  tokens: { before: string; word: string; after: string; isTarget: boolean }[];
}

/** One verse, word by word with display punctuation, marking the target token. */
export async function verseSnippet(
  db: Db,
  verseId: number,
  targetTokenId: number,
): Promise<VerseSnippet> {
  const rows = await db
    .select({
      id: tokens.id,
      surface: tokens.surface,
      word: tokens.word,
      displayRef: sql<string>`${books.name} || ' ' || ${chapters.number} || ':' || ${verses.number}`,
    })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(chapters, eq(chapters.id, verses.chapterId))
    .innerJoin(books, eq(books.id, chapters.bookId))
    .where(eq(tokens.verseId, verseId))
    .orderBy(asc(tokens.position));
  return {
    displayRef: rows[0]?.displayRef ?? "",
    tokens: rows.map((t) => ({
      ...splitSurface(t.surface, t.word),
      word: t.word,
      isTarget: t.id === targetTokenId,
    })),
  };
}
