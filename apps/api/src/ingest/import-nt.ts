import { decodeMorphology } from "@gbt/shared";
import { sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { books, chapters, dataSources, lemmas, morphology, tokens, verses } from "../db/schema";
import { createGlossLookup, type DodsonEntry } from "./dodson";
import { IngestError } from "./errors";
import type { MorphgntToken } from "./morphgnt";
import type { NtBook } from "./nt-books";
import { sourceRows } from "./sources";

export interface ImportInput {
  books: { book: NtBook; tokens: MorphgntToken[] }[];
  lexicon: Map<string, DodsonEntry>;
  commits: { morphgnt: string; dodson: string };
}

export interface ImportSummary {
  books: number;
  verses: number;
  tokens: number;
  lemmas: number;
  morphologies: number;
  glossedLemmas: number;
  glossedTokenShare: number;
}

// Keeps each INSERT well under Postgres' 65,535 bind-parameter limit.
const BATCH = 4000;
function* batches<T>(rows: T[]): Generator<T[]> {
  for (let i = 0; i < rows.length; i += BATCH) yield rows.slice(i, i + BATCH);
}

const verseKey = (book: number, chapter: number, verse: number) => `${book}:${chapter}:${verse}`;

/**
 * Imports the given books (normally the whole NT; tests pass a subset) in one transaction. Re-running with the same input leaves the DB
 * unchanged: every write is an upsert on a natural key, so row ids stay stable. Glosses from
 * the `curated` source are never overwritten.
 */
export async function importNt(db: Db, input: ImportInput): Promise<ImportSummary> {
  return db.transaction(async (tx) => {
    // Sources
    for (const row of sourceRows(input.commits)) {
      await tx
        .insert(dataSources)
        .values(row)
        .onConflictDoUpdate({
          target: dataSources.key,
          set: {
            name: row.name,
            version: row.version,
            licence: row.licence,
            attribution: row.attribution,
            url: row.url,
          },
        });
    }
    const sourceIds = new Map(
      (await tx.select({ id: dataSources.id, key: dataSources.key }).from(dataSources)).map((s) => [
        s.key,
        s.id,
      ]),
    );
    const morphgntSourceId = sourceIds.get("morphgnt-sblgnt")!;
    const dodsonSourceId = sourceIds.get("dodson")!;

    // Books
    await tx
      .insert(books)
      .values(
        input.books.map(({ book }) => ({
          name: book.name,
          abbrev: book.abbrev,
          canonicalOrder: book.order,
          testament: "NT" as const,
        })),
      )
      .onConflictDoUpdate({
        target: books.abbrev,
        set: { name: sql`excluded.name`, canonicalOrder: sql`excluded.canonical_order` },
      });
    const bookIds = new Map(
      (await tx.select({ id: books.id, order: books.canonicalOrder }).from(books)).map((b) => [
        b.order,
        b.id,
      ]),
    );

    // Chapters and verses, in canonical order
    const chapterRows = new Map<string, { bookId: number; number: number }>();
    const verseRows: { book: NtBook; chapter: number; verse: number }[] = [];
    const seenVerses = new Set<string>();
    for (const { book, tokens: bookTokens } of input.books) {
      for (const t of bookTokens) {
        chapterRows.set(`${book.order}:${t.chapter}`, {
          bookId: bookIds.get(book.order)!,
          number: t.chapter,
        });
        const key = verseKey(book.order, t.chapter, t.verse);
        if (!seenVerses.has(key)) {
          seenVerses.add(key);
          verseRows.push({ book, chapter: t.chapter, verse: t.verse });
        }
      }
    }
    for (const batch of batches([...chapterRows.values()])) {
      await tx.insert(chapters).values(batch).onConflictDoNothing();
    }
    const chapterIds = new Map(
      (
        await tx
          .select({ id: chapters.id, bookId: chapters.bookId, number: chapters.number })
          .from(chapters)
      ).map((c) => [`${c.bookId}:${c.number}`, c.id]),
    );

    const verseValues = verseRows.map((v, i) => ({
      chapterId: chapterIds.get(`${bookIds.get(v.book.order)}:${v.chapter}`)!,
      number: v.verse,
      ref: `${v.book.abbrev} ${v.chapter}:${v.verse}`,
      ordinal: i + 1,
    }));
    for (const batch of batches(verseValues)) {
      await tx
        .insert(verses)
        .values(batch)
        .onConflictDoUpdate({
          target: verses.ref,
          set: {
            chapterId: sql`excluded.chapter_id`,
            number: sql`excluded.number`,
            ordinal: sql`excluded.ordinal`,
          },
        });
    }
    const verseIdsByRef = new Map(
      (await tx.select({ id: verses.id, ref: verses.ref }).from(verses)).map((v) => [v.ref, v.id]),
    );

    // Morphology: one row per distinct analysis
    const allTokens = input.books.flatMap(({ book, tokens: t }) => t.map((tok) => ({ book, tok })));
    const analyses = new Map<string, { posCode: string; parseCode: string }>();
    for (const { tok } of allTokens) {
      analyses.set(`${tok.posCode} ${tok.parseCode}`, {
        posCode: tok.posCode,
        parseCode: tok.parseCode,
      });
    }
    const morphValues = [...analyses.values()].map((a) => ({
      ...a,
      ...decodeMorphology(a.posCode, a.parseCode),
    }));
    for (const batch of batches(morphValues)) {
      await tx
        .insert(morphology)
        .values(batch)
        .onConflictDoUpdate({
          target: [morphology.posCode, morphology.parseCode],
          set: {
            partOfSpeech: sql`excluded.part_of_speech`,
            person: sql`excluded.person`,
            tense: sql`excluded.tense`,
            voice: sql`excluded.voice`,
            mood: sql`excluded.mood`,
            case: sql`excluded.case`,
            number: sql`excluded.number`,
            gender: sql`excluded.gender`,
            degree: sql`excluded.degree`,
          },
        });
    }
    const morphIds = new Map(
      (
        await tx
          .select({
            id: morphology.id,
            posCode: morphology.posCode,
            parseCode: morphology.parseCode,
          })
          .from(morphology)
      ).map((m) => [`${m.posCode} ${m.parseCode}`, m.id]),
    );

    // Lemmas (existing glosses are left alone here)
    const lemmaValues = [...new Set(allTokens.map(({ tok }) => tok.lemma))].map((lemma) => ({
      lemma,
    }));
    for (const batch of batches(lemmaValues)) {
      await tx.insert(lemmas).values(batch).onConflictDoNothing();
    }
    const lemmaIds = new Map(
      (await tx.select({ id: lemmas.id, lemma: lemmas.lemma }).from(lemmas)).map((l) => [
        l.lemma,
        l.id,
      ]),
    );

    // Tokens
    const tokenValues = allTokens.map(({ book, tok }) => ({
      verseId: verseIdsByRef.get(`${book.abbrev} ${tok.chapter}:${tok.verse}`)!,
      position: tok.position,
      surface: tok.surface,
      word: tok.word,
      normalized: tok.normalized,
      lemmaId: lemmaIds.get(tok.lemma)!,
      morphologyId: morphIds.get(`${tok.posCode} ${tok.parseCode}`)!,
      sourceId: morphgntSourceId,
    }));
    for (const batch of batches(tokenValues)) {
      await tx
        .insert(tokens)
        .values(batch)
        .onConflictDoUpdate({
          target: [tokens.verseId, tokens.position],
          set: {
            surface: sql`excluded.surface`,
            word: sql`excluded.word`,
            normalized: sql`excluded.normalized`,
            lemmaId: sql`excluded.lemma_id`,
            morphologyId: sql`excluded.morphology_id`,
            sourceId: sql`excluded.source_id`,
          },
        });
    }

    // Fresh statistics for the rows just loaded (ANALYZE sees this transaction's rows); without
    // them the planner can pick nested loops that turn the queries below from ~1s into minutes.
    await tx.execute(sql`analyze ${tokens}, ${lemmas}, ${morphology}, ${verses}, ${chapters}`);

    // Frequencies and each lemma's most common part of speech, computed from imported tokens.
    // Aggregating tokens per lemma first keeps this a single pass over tokens.
    await tx.execute(sql`
      update ${lemmas} l set
        nt_frequency = coalesce(f.n, 0),
        part_of_speech = f.pos
      from ${lemmas} l2
      left join (
        select t.lemma_id, count(*)::int as n,
          mode() within group (order by m.part_of_speech) as pos
        from ${tokens} t
        join ${morphology} m on m.id = t.morphology_id
        group by t.lemma_id
      ) f on f.lemma_id = l2.id
      where l2.id = l.id`);

    // Glosses from Dodson, never replacing curated ones
    const lookup = createGlossLookup(input.lexicon);
    const curatedId = sourceIds.get("curated");
    const glossRows = await tx
      .select({ id: lemmas.id, lemma: lemmas.lemma, glossSourceId: lemmas.glossSourceId })
      .from(lemmas);
    const glossUpdates: { id: number; brief: string; full: string }[] = [];
    for (const row of glossRows) {
      if (curatedId !== undefined && row.glossSourceId === curatedId) continue;
      const entry = lookup(row.lemma);
      if (entry) glossUpdates.push({ id: row.id, ...entry });
    }
    for (const batch of batches(glossUpdates)) {
      const values = sql.join(
        batch.map((g) => sql`(${g.id}::int, ${g.brief}::text, ${g.full}::text)`),
        sql`, `,
      );
      await tx.execute(sql`
        update ${lemmas} set gloss = v.brief, extended_gloss = v.full_def,
          gloss_source_id = ${dodsonSourceId}
        from (values ${values}) as v(id, brief, full_def)
        where ${lemmas.id} = v.id`);
    }
    const glossedLemmas = glossUpdates.length;

    // Validation: DB contents must match what was parsed, book by book
    const counts = await tx.execute<{ abbrev: string; n: number }>(sql`
      select b.abbrev, count(t.id)::int as n
      from ${books} b
      join ${chapters} c on c.book_id = b.id
      join ${verses} v on v.chapter_id = c.id
      join ${tokens} t on t.verse_id = v.id
      group by b.abbrev`);
    const dbCounts = new Map(counts.map((r) => [r.abbrev, r.n]));
    for (const { book, tokens: bookTokens } of input.books) {
      const inDb = dbCounts.get(book.abbrev) ?? 0;
      if (inDb !== bookTokens.length) {
        throw new IngestError(
          `${book.abbrev}: ${bookTokens.length} tokens parsed but ${inDb} in the database`,
        );
      }
    }
    const [freq] = await tx.execute<{ total: number }>(
      sql`select coalesce(sum(nt_frequency), 0)::int as total from ${lemmas}`,
    );
    if (freq?.total !== tokenValues.length) {
      throw new IngestError(
        `Lemma frequencies sum to ${freq?.total}, expected ${tokenValues.length}`,
      );
    }

    const [glossed] = await tx.execute<{ share: number }>(sql`
      select coalesce(sum(nt_frequency) filter (where gloss is not null), 0)::float
        / nullif(sum(nt_frequency), 0) as share
      from ${lemmas}`);

    return {
      books: input.books.length,
      verses: verseValues.length,
      tokens: tokenValues.length,
      lemmas: lemmaValues.length,
      morphologies: morphValues.length,
      glossedLemmas,
      glossedTokenShare: glossed?.share ?? 0,
    };
  });
}
