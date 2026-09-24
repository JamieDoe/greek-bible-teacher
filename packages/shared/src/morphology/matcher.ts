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
} from "./categories";

/**
 * A grammar-concept rule's matcher: a token matches when every listed feature equals its
 * morphology (and its lemma, if `lemma` is given). Stored as JSON in
 * `grammar_concept_rules.match`; more keys means a more specific rule.
 */
export const tokenMatcherSchema = z
  .object({
    lemma: z
      .string()
      .min(1)
      .refine((s) => s === s.normalize("NFC"), "lemma must be NFC-normalised"),
    partOfSpeech: z.enum(partsOfSpeech),
    person: z.enum(persons),
    tense: z.enum(tenses),
    voice: z.enum(voices),
    mood: z.enum(moods),
    case: z.enum(grammaticalCases),
    number: z.enum(grammaticalNumbers),
    gender: z.enum(genders),
    degree: z.enum(degrees),
  })
  .partial()
  .strict()
  .refine((m) => Object.keys(m).length > 0, "A matcher needs at least one feature");

export type TokenMatcher = z.infer<typeof tokenMatcherSchema>;
