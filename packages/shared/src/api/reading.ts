import { z } from "zod";
import {
  degrees,
  genders,
  grammaticalCases,
  grammaticalNumbers,
  moods,
  partsOfSpeech,
  persons,
  tenses,
  voices,
} from "../morphology/categories";

/** Positive integer id from a URL segment. */
export const idParamSchema = z.coerce.number().int().positive();

export const morphologySchema = z.object({
  posCode: z.string(),
  parseCode: z.string(),
  partOfSpeech: z.enum(partsOfSpeech),
  person: z.enum(persons).nullable(),
  tense: z.enum(tenses).nullable(),
  voice: z.enum(voices).nullable(),
  mood: z.enum(moods).nullable(),
  case: z.enum(grammaticalCases).nullable(),
  number: z.enum(grammaticalNumbers).nullable(),
  gender: z.enum(genders).nullable(),
  degree: z.enum(degrees).nullable(),
  /** e.g. ["Noun", "Dative", "Singular", "Feminine"] */
  labels: z.array(z.string()),
});
export type Morphology = z.infer<typeof morphologySchema>;

export const readerTokenSchema = z.object({
  id: z.number().int(),
  position: z.number().int(),
  /** Punctuation before and after the word, with apparatus sigla removed. Not tappable. */
  before: z.string(),
  word: z.string(),
  after: z.string(),
  lemma: z.object({ id: z.number().int(), lemma: z.string(), gloss: z.string().nullable() }),
  morphology: morphologySchema,
});
export type ReaderToken = z.infer<typeof readerTokenSchema>;

export const passageSummarySchema = z.object({
  id: z.number().int(),
  title: z.string(),
  startRef: z.string(),
  endRef: z.string(),
});
export type PassageSummary = z.infer<typeof passageSummarySchema>;

export const passagesResponseSchema = z.object({ passages: z.array(passageSummarySchema) });
export type PassagesResponse = z.infer<typeof passagesResponseSchema>;

export const passageResponseSchema = z.object({
  passage: passageSummarySchema.extend({
    verses: z.array(
      z.object({
        id: z.number().int(),
        ref: z.string(),
        /** Human-readable reference, e.g. "John 1:1". */
        displayRef: z.string(),
        chapter: z.number().int(),
        number: z.number().int(),
        tokens: z.array(readerTokenSchema),
      }),
    ),
  }),
});
export type PassageResponse = z.infer<typeof passageResponseSchema>;

export const tokenDetailResponseSchema = z.object({
  token: z.object({
    id: z.number().int(),
    ref: z.string(),
    displayRef: z.string(),
    position: z.number().int(),
    /** Exactly as in the source, including punctuation and apparatus sigla. */
    surface: z.string(),
    word: z.string(),
    normalized: z.string(),
  }),
  lemma: z.object({
    id: z.number().int(),
    lemma: z.string(),
    gloss: z.string().nullable(),
    extendedGloss: z.string().nullable(),
    partOfSpeech: z.enum(partsOfSpeech).nullable(),
    ntFrequency: z.number().int(),
    glossSource: z.string().nullable(),
  }),
  morphology: morphologySchema,
  occurrences: z.object({
    /** Other NT tokens of this lemma, nearest first. */
    nearby: z.array(
      z.object({
        tokenId: z.number().int(),
        ref: z.string(),
        displayRef: z.string(),
        word: z.string(),
      }),
    ),
    /** NT tokens with exactly this form (normalised) and lemma. */
    sameFormCount: z.number().int(),
  }),
  /** Curated grammar notes whose rules match this token's morphology. */
  concepts: z.array(z.object({ slug: z.string(), title: z.string(), note: z.string().nullable() })),
});
export type TokenDetailResponse = z.infer<typeof tokenDetailResponseSchema>;

export const sourcesResponseSchema = z.object({
  sources: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      version: z.string().nullable(),
      licence: z.string(),
      attribution: z.string(),
      url: z.string().nullable(),
    }),
  ),
});
export type SourcesResponse = z.infer<typeof sourcesResponseSchema>;
