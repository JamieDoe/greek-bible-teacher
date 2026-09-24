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
 * A grammar-concept rule's matcher: a token matches when each listed feature equals its
 * morphology. Stored as JSON in `grammar_concept_rules.match`.
 */
export const morphologyMatcherSchema = z
  .object({
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

export type MorphologyMatcher = z.infer<typeof morphologyMatcherSchema>;
