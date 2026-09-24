import {
  type Morphology,
  morphologyLabels,
  type PassageResponse,
  type PassageSummary,
  splitSurface,
  type TokenDetailResponse,
} from "@gbt/shared";
import { and, asc, between, count, eq, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../db/client";
import {
  books,
  chapters,
  dataSources,
  grammarConceptRules,
  grammarConcepts,
  lemmas,
  morphology,
  passages,
  tokens,
  verses,
} from "../db/schema";

// Queries behind the reader. Kept free of HTTP concerns so the future AI context builder
// (DECISIONS: AI phase 2) can reuse the same token lookup.

/** "John 1:1" from the book name and the verse's chapter and number. */
const displayRef = sql<string>`${books.name} || ' ' || ${chapters.number} || ':' || ${verses.number}`;

const startVerse = alias(verses, "start_verse");
const endVerse = alias(verses, "end_verse");

const passageSummaryColumns = {
  id: passages.id,
  title: passages.title,
  startRef: startVerse.ref,
  endRef: endVerse.ref,
};

export async function listPassages(db: Db): Promise<PassageSummary[]> {
  return db
    .select(passageSummaryColumns)
    .from(passages)
    .innerJoin(startVerse, eq(startVerse.id, passages.startVerseId))
    .innerJoin(endVerse, eq(endVerse.id, passages.endVerseId))
    .orderBy(sql`${passages.curriculumOrder} asc nulls last`, asc(passages.id));
}

type MorphologyRow = typeof morphology.$inferSelect;

function toMorphology(m: MorphologyRow): Morphology {
  const { id: _id, ...fields } = m;
  return { ...fields, labels: morphologyLabels(fields) };
}

export async function getPassage(db: Db, id: number): Promise<PassageResponse["passage"] | null> {
  const [passage] = await db
    .select({
      ...passageSummaryColumns,
      startOrdinal: startVerse.ordinal,
      endOrdinal: endVerse.ordinal,
    })
    .from(passages)
    .innerJoin(startVerse, eq(startVerse.id, passages.startVerseId))
    .innerJoin(endVerse, eq(endVerse.id, passages.endVerseId))
    .where(eq(passages.id, id));
  if (!passage) return null;

  const rows = await db
    .select({
      verse: {
        id: verses.id,
        ref: verses.ref,
        displayRef,
        number: verses.number,
        chapter: chapters.number,
      },
      token: {
        id: tokens.id,
        position: tokens.position,
        surface: tokens.surface,
        word: tokens.word,
      },
      lemma: { id: lemmas.id, lemma: lemmas.lemma, gloss: lemmas.gloss },
      morphology,
    })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(chapters, eq(chapters.id, verses.chapterId))
    .innerJoin(books, eq(books.id, chapters.bookId))
    .innerJoin(lemmas, eq(lemmas.id, tokens.lemmaId))
    .innerJoin(morphology, eq(morphology.id, tokens.morphologyId))
    .where(between(verses.ordinal, passage.startOrdinal, passage.endOrdinal))
    .orderBy(asc(verses.ordinal), asc(tokens.position));

  const verseList: PassageResponse["passage"]["verses"] = [];
  for (const row of rows) {
    let verse = verseList.at(-1);
    if (verse?.id !== row.verse.id) {
      verse = { ...row.verse, tokens: [] };
      verseList.push(verse);
    }
    verse.tokens.push({
      id: row.token.id,
      position: row.token.position,
      word: row.token.word,
      ...splitSurface(row.token.surface, row.token.word),
      lemma: row.lemma,
      morphology: toMorphology(row.morphology),
    });
  }

  const { startOrdinal: _s, endOrdinal: _e, ...summary } = passage;
  return { ...summary, verses: verseList };
}

const NEARBY_LIMIT = 6;

export async function getTokenDetail(db: Db, id: number): Promise<TokenDetailResponse | null> {
  const [row] = await db
    .select({
      token: {
        id: tokens.id,
        position: tokens.position,
        surface: tokens.surface,
        word: tokens.word,
        normalized: tokens.normalized,
      },
      ref: verses.ref,
      displayRef,
      ordinal: verses.ordinal,
      bookId: chapters.bookId,
      lemma: {
        id: lemmas.id,
        lemma: lemmas.lemma,
        gloss: lemmas.gloss,
        extendedGloss: lemmas.extendedGloss,
        partOfSpeech: lemmas.partOfSpeech,
        ntFrequency: lemmas.ntFrequency,
      },
      glossSource: dataSources.name,
      morphology,
    })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(chapters, eq(chapters.id, verses.chapterId))
    .innerJoin(books, eq(books.id, chapters.bookId))
    .innerJoin(lemmas, eq(lemmas.id, tokens.lemmaId))
    .innerJoin(morphology, eq(morphology.id, tokens.morphologyId))
    .leftJoin(dataSources, eq(dataSources.id, lemmas.glossSourceId))
    .where(eq(tokens.id, id));
  if (!row) return null;

  const [nearby, [sameForm], concepts] = await Promise.all([
    db
      .select({ tokenId: tokens.id, ref: verses.ref, displayRef, word: tokens.word })
      .from(tokens)
      .innerJoin(verses, eq(verses.id, tokens.verseId))
      .innerJoin(chapters, eq(chapters.id, verses.chapterId))
      .innerJoin(books, eq(books.id, chapters.bookId))
      .where(and(eq(tokens.lemmaId, row.lemma.id), ne(tokens.id, id)))
      .orderBy(
        // Same book first, then nearest in canonical order.
        sql`${chapters.bookId} <> ${row.bookId}`,
        sql`abs(${verses.ordinal} - ${row.ordinal})`,
        asc(verses.ordinal),
        asc(tokens.position),
      )
      .limit(NEARBY_LIMIT),
    db
      .select({ n: count() })
      .from(tokens)
      .where(and(eq(tokens.lemmaId, row.lemma.id), eq(tokens.normalized, row.token.normalized))),
    // A rule matches when its matcher is contained in the token's morphology (keys mirror
    // MorphologyMatcher; null features are dropped so they can never match).
    db
      .selectDistinctOn([grammarConcepts.curriculumOrder, grammarConcepts.id], {
        slug: grammarConcepts.slug,
        title: grammarConcepts.title,
        note: grammarConceptRules.note,
      })
      .from(grammarConceptRules)
      .innerJoin(grammarConcepts, eq(grammarConcepts.id, grammarConceptRules.conceptId))
      .where(
        sql`${grammarConceptRules.match} <@ jsonb_strip_nulls(jsonb_build_object(
          'partOfSpeech', ${row.morphology.partOfSpeech}::text,
          'person', ${row.morphology.person}::text,
          'tense', ${row.morphology.tense}::text,
          'voice', ${row.morphology.voice}::text,
          'mood', ${row.morphology.mood}::text,
          'case', ${row.morphology.case}::text,
          'number', ${row.morphology.number}::text,
          'gender', ${row.morphology.gender}::text,
          'degree', ${row.morphology.degree}::text))`,
      )
      .orderBy(asc(grammarConcepts.curriculumOrder), asc(grammarConcepts.id)),
  ]);

  return {
    token: { ...row.token, ref: row.ref, displayRef: row.displayRef },
    lemma: { ...row.lemma, glossSource: row.glossSource },
    morphology: toMorphology(row.morphology),
    occurrences: { nearby, sameFormCount: sameForm?.n ?? 0 },
    concepts,
  };
}
