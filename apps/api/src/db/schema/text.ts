import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, unique } from "drizzle-orm/pg-core";
import { testamentEnum } from "./enums";
import { lemmas, morphology } from "./lexicon";
import { dataSources } from "./sources";

export const books = pgTable(
  "books",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    name: text("name").notNull(),
    /** USFM-style code, e.g. `JHN`. */
    abbrev: text("abbrev").notNull().unique(),
    /** Canonical position within the testament (Matthew = 1). */
    canonicalOrder: integer("canonical_order").notNull(),
    testament: testamentEnum("testament").notNull(),
  },
  (t) => [
    unique("books_testament_order_unique").on(t.testament, t.canonicalOrder),
    check("books_canonical_order_positive", sql`${t.canonicalOrder} > 0`),
  ],
);

export const chapters = pgTable(
  "chapters",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id),
    number: integer("number").notNull(),
  },
  (t) => [
    unique("chapters_book_number_unique").on(t.bookId, t.number),
    check("chapters_number_positive", sql`${t.number} > 0`),
  ],
);

export const verses = pgTable(
  "verses",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id),
    number: integer("number").notNull(),
    /** Display reference, e.g. `JHN 1:1`. */
    ref: text("ref").notNull().unique(),
    /** Canonical position across the whole NT; passages are ordinal ranges. */
    ordinal: integer("ordinal").notNull().unique(),
  },
  (t) => [
    unique("verses_chapter_number_unique").on(t.chapterId, t.number),
    check("verses_number_positive", sql`${t.number} > 0`),
  ],
);

export const tokens = pgTable(
  "tokens",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    verseId: integer("verse_id")
      .notNull()
      .references(() => verses.id),
    /** 1-based position within the verse. */
    position: integer("position").notNull(),
    /** Original text including punctuation, exactly as in the source. */
    surface: text("surface").notNull(),
    /** Punctuation stripped. */
    word: text("word").notNull(),
    /** Source's normalised form (e.g. grave → acute). */
    normalized: text("normalized").notNull(),
    lemmaId: integer("lemma_id")
      .notNull()
      .references(() => lemmas.id),
    morphologyId: integer("morphology_id")
      .notNull()
      .references(() => morphology.id),
    sourceId: integer("source_id")
      .notNull()
      .references(() => dataSources.id),
  },
  (t) => [
    // Also serves "tokens by verse" lookups (leading column).
    unique("tokens_verse_position_unique").on(t.verseId, t.position),
    index("tokens_lemma_idx").on(t.lemmaId),
    index("tokens_morphology_idx").on(t.morphologyId),
    check("tokens_position_positive", sql`${t.position} > 0`),
  ],
);
