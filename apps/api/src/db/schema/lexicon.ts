import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, unique } from "drizzle-orm/pg-core";
import {
  caseEnum,
  degreeEnum,
  genderEnum,
  moodEnum,
  numberEnum,
  partOfSpeechEnum,
  personEnum,
  tenseEnum,
  voiceEnum,
} from "./enums";
import { dataSources } from "./sources";

export const lemmas = pgTable(
  "lemmas",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    /** Dictionary form, NFC-normalised. */
    lemma: text("lemma").notNull().unique(),
    gloss: text("gloss"),
    extendedGloss: text("extended_gloss"),
    partOfSpeech: partOfSpeechEnum("part_of_speech"),
    /** Token count in the imported NT; computed by ingestion, never hand-set. */
    ntFrequency: integer("nt_frequency").notNull().default(0),
    glossSourceId: integer("gloss_source_id").references(() => dataSources.id),
  },
  (t) => [
    index("lemmas_nt_frequency_idx").on(t.ntFrequency.desc()),
    check("lemmas_nt_frequency_nonneg", sql`${t.ntFrequency} >= 0`),
    check("lemmas_gloss_has_source", sql`${t.gloss} is null or ${t.glossSourceId} is not null`),
  ],
);

/** One row per distinct (POS code, parse code) analysis, shared by all tokens with it. */
export const morphology = pgTable(
  "morphology",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    /** Raw MorphGNT POS code, e.g. `N-`, `RA`. */
    posCode: text("pos_code").notNull(),
    /** Raw 8-character MorphGNT parse code, e.g. `----NSM-`. */
    parseCode: text("parse_code").notNull(),
    partOfSpeech: partOfSpeechEnum("part_of_speech").notNull(),
    person: personEnum("person"),
    tense: tenseEnum("tense"),
    voice: voiceEnum("voice"),
    mood: moodEnum("mood"),
    case: caseEnum("case"),
    number: numberEnum("number"),
    gender: genderEnum("gender"),
    degree: degreeEnum("degree"),
  },
  (t) => [
    unique("morphology_pos_parse_unique").on(t.posCode, t.parseCode),
    check("morphology_pos_code_len", sql`char_length(${t.posCode}) = 2`),
    check("morphology_parse_code_len", sql`char_length(${t.parseCode}) = 8`),
  ],
);
