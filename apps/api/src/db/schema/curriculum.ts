import type { GrammarParadigm, GrammarQuickCheck, TokenMatcher } from "@gbt/shared";
import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { disclosureLevelEnum, lessonItemKindEnum } from "./enums";
import { lemmas } from "./lexicon";
import { tokens, verses } from "./text";

export const grammarConcepts = pgTable(
  "grammar_concepts",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    slug: text("slug").notNull().unique(),
    curriculumOrder: integer("curriculum_order").notNull().unique(),
    title: text("title").notNull(),
    summarySimple: text("summary_simple").notNull(),
    /** Markdown. */
    body: text("body").notNull(),
    /** Lowest disclosure level at which technical terminology is shown. */
    terminologyLevel: disclosureLevelEnum("terminology_level").notNull().default("expanded"),
    /** The grammar step's before/after table and quick check (validated when seeded). */
    paradigm: jsonb("paradigm").$type<GrammarParadigm>(),
    quickCheck: jsonb("quick_check").$type<GrammarQuickCheck>(),
  },
  (t) => [check("grammar_concepts_order_positive", sql`${t.curriculumOrder} > 0`)],
);

/** Real NT tokens illustrating a concept (FK-checked rather than an id array). */
export const grammarConceptExamples = pgTable(
  "grammar_concept_examples",
  {
    conceptId: integer("concept_id")
      .notNull()
      .references(() => grammarConcepts.id, { onDelete: "cascade" }),
    tokenId: integer("token_id")
      .notNull()
      .references(() => tokens.id),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.conceptId, t.tokenId] }),
    unique("grammar_concept_examples_position_unique").on(t.conceptId, t.position),
  ],
);

/**
 * Links tokens to concepts: a token matches when every field in `match` equals its morphology
 * (e.g. `{ "case": "dative" }`). `note` is the curated "Why this form?" text for that match.
 */
export const grammarConceptRules = pgTable(
  "grammar_concept_rules",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    conceptId: integer("concept_id")
      .notNull()
      .references(() => grammarConcepts.id, { onDelete: "cascade" }),
    match: jsonb("match").$type<TokenMatcher>().notNull(),
    note: text("note"),
  },
  (t) => [
    check(
      "grammar_concept_rules_match_nonempty_object",
      sql`jsonb_typeof(${t.match}) = 'object' and ${t.match} <> '{}'::jsonb`,
    ),
  ],
);

export const passages = pgTable(
  "passages",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    title: text("title").notNull(),
    startVerseId: integer("start_verse_id")
      .notNull()
      .references(() => verses.id),
    endVerseId: integer("end_verse_id")
      .notNull()
      .references(() => verses.id),
    /** Computed by the pure difficulty function in @gbt/shared; null until scored. */
    difficultyScore: real("difficulty_score"),
    curriculumOrder: integer("curriculum_order").unique(),
  },
  (t) => [unique("passages_range_unique").on(t.startVerseId, t.endVerseId)],
);

/** Concepts a learner needs before reading a passage (FK-checked rather than an id array). */
export const passageRequiredConcepts = pgTable(
  "passage_required_concepts",
  {
    passageId: integer("passage_id")
      .notNull()
      .references(() => passages.id, { onDelete: "cascade" }),
    conceptId: integer("concept_id")
      .notNull()
      .references(() => grammarConcepts.id),
  },
  (t) => [primaryKey({ columns: [t.passageId, t.conceptId] })],
);

export const lessons = pgTable(
  "lessons",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    curriculumOrder: integer("curriculum_order").notNull().unique(),
    title: text("title").notNull(),
    /** One lesson per passage (its stable key for re-seeding). */
    passageId: integer("passage_id")
      .references(() => passages.id)
      .unique(),
  },
  (t) => [check("lessons_order_positive", sql`${t.curriculumOrder} > 0`)],
);

export const lessonItems = pgTable(
  "lesson_items",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: lessonItemKindEnum("kind").notNull(),
    lemmaId: integer("lemma_id").references(() => lemmas.id),
    conceptId: integer("concept_id").references(() => grammarConcepts.id),
    passageId: integer("passage_id").references(() => passages.id),
  },
  (t) => [
    unique("lesson_items_position_unique").on(t.lessonId, t.position),
    // Each kind points at exactly its own target; `review` covers whatever is due.
    check(
      "lesson_items_target_matches_kind",
      sql`case ${t.kind}
        when 'vocab' then ${t.lemmaId} is not null and ${t.conceptId} is null and ${t.passageId} is null
        when 'grammar' then ${t.conceptId} is not null and ${t.lemmaId} is null and ${t.passageId} is null
        when 'reading' then ${t.passageId} is not null and ${t.lemmaId} is null and ${t.conceptId} is null
        when 'review' then ${t.lemmaId} is null and ${t.conceptId} is null and ${t.passageId} is null
      end`,
    ),
  ],
);
