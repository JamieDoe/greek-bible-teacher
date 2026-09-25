import { type Declension, type Gender, nounDeclension, type ReviewItem } from "@gbt/shared";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { books, chapters, morphology, tokens, verses } from "../db/schema";

/** Up to this many forms are shown ("Forms you'll meet"). */
const FORMS = 4;

/**
 * What a new-word card shows beyond the gloss: for nouns the gender the text uses and the
 * declension derived from its genitive (shared `nounDeclension`), and the forms a reader meets
 * most often in the NT.
 */
export async function wordFacts(
  db: Db,
  lemmaId: number,
  lemma: string,
  isNoun: boolean,
): Promise<{
  gender: Gender | null;
  declension: Declension | null;
  forms: ReviewItem["lemma"]["forms"];
}> {
  const forms = await db
    .select({ form: tokens.normalized, count: count() })
    .from(tokens)
    .where(eq(tokens.lemmaId, lemmaId))
    .groupBy(tokens.normalized)
    .orderBy(desc(count()), tokens.normalized)
    .limit(FORMS);
  if (!isNoun) return { gender: null, declension: null, forms };

  const [gender] = await db
    .select({ gender: morphology.gender, n: count() })
    .from(tokens)
    .innerJoin(morphology, eq(morphology.id, tokens.morphologyId))
    .where(and(eq(tokens.lemmaId, lemmaId), sql`${morphology.gender} is not null`))
    .groupBy(morphology.gender)
    .orderBy(desc(count()))
    .limit(1);
  const [genitive] = await db
    .select({ form: tokens.normalized, n: count() })
    .from(tokens)
    .innerJoin(morphology, eq(morphology.id, tokens.morphologyId))
    .where(
      and(
        eq(tokens.lemmaId, lemmaId),
        eq(morphology.case, "genitive"),
        eq(morphology.number, "singular"),
      ),
    )
    .groupBy(tokens.normalized)
    .orderBy(desc(count()))
    .limit(1);
  const g = gender?.gender ?? null;
  return { gender: g, declension: nounDeclension(lemma, g, genitive?.form ?? null), forms };
}

/** How often a lemma occurs in a passage (by verse ordinal range), and where first. */
export async function occurrencesInPassage(
  db: Db,
  lemmaId: number,
  passage: { title: string; startOrdinal: number; endOrdinal: number },
): Promise<ReviewItem["inPassage"]> {
  const rows = await db
    .select({
      displayRef: sql<string>`${books.name} || ' ' || ${chapters.number} || ':' || ${verses.number}`,
    })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(chapters, eq(chapters.id, verses.chapterId))
    .innerJoin(books, eq(books.id, chapters.bookId))
    .where(
      and(
        eq(tokens.lemmaId, lemmaId),
        sql`${verses.ordinal} between ${passage.startOrdinal} and ${passage.endOrdinal}`,
      ),
    )
    .orderBy(verses.ordinal, tokens.position);
  if (rows.length === 0) return null;
  return { title: passage.title, displayRef: rows[0]!.displayRef, count: rows.length };
}
