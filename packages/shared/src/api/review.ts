import { z } from "zod";
import { reviewContexts, reviewGrades } from "../learning/enums";
import { genders, partsOfSpeech } from "../morphology/categories";

export const reviewQueueQuerySchema = z
  .object({
    /** Review exactly these words (e.g. those looked up while reading), comma-separated ids. */
    lemmaIds: z
      .string()
      .regex(/^\d+(,\d+)*$/, "comma-separated lemma ids")
      .transform((s) => [...new Set(s.split(",").map(Number))])
      .pipe(z.array(z.number().int().positive()).max(50))
      .optional(),
    /** "due": only words due now, no new ones (the lesson's first step). */
    mode: z.enum(["mixed", "due"]).default("mixed"),
  })
  .strict();
export type ReviewQueueQuery = z.infer<typeof reviewQueueQuerySchema>;

export const reviewItemKinds = ["due", "new", "lookedUp"] as const;

export const reviewItemSchema = z.object({
  lemmaId: z.number().int(),
  kind: z.enum(reviewItemKinds),
  lemma: z.object({
    lemma: z.string(),
    gloss: z.string(),
    partOfSpeech: z.enum(partsOfSpeech).nullable(),
    ntFrequency: z.number().int(),
    /** Nouns: the gender the text uses, and the declension derived from it (null: unsure). */
    gender: z.enum(genders).nullable(),
    declension: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
    /** The forms a reader meets most often in the NT, most frequent first (up to 4). */
    forms: z.array(z.object({ form: z.string(), count: z.number().int() })),
  }),
  /** How often the word comes up in the passage the learner is working towards. */
  inPassage: z
    .object({ title: z.string(), displayRef: z.string(), count: z.number().int() })
    .nullable(),
  /** The word's current schedule, so the client can preview the next interval (null: new). */
  srs: z
    .object({
      difficulty: z.number(),
      stability: z.number(),
      intervalDays: z.number(),
      nextReviewAt: z.iso.datetime(),
      lastReviewedAt: z.iso.datetime(),
    })
    .nullable(),
  /** A verse using the word, with the form marked (shown on new-word cards). */
  example: z
    .object({
      displayRef: z.string(),
      tokens: z.array(
        z.object({
          before: z.string(),
          word: z.string(),
          after: z.string(),
          isTarget: z.boolean(),
        }),
      ),
    })
    .nullable(),
  exercise: z.object({
    type: z.enum(["gloss", "context"]),
    /** For "context": the verse the form comes from, with the target token marked. */
    context: z
      .object({
        displayRef: z.string(),
        tokens: z.array(
          z.object({
            before: z.string(),
            word: z.string(),
            after: z.string(),
            isTarget: z.boolean(),
          }),
        ),
      })
      .nullable(),
    options: z.array(z.string()).min(2),
    answerIndex: z.number().int().nonnegative(),
  }),
});
export type ReviewItem = z.infer<typeof reviewItemSchema>;

export const reviewQueueResponseSchema = z.object({
  items: z.array(reviewItemSchema),
  /** Words due now in total (the queue may hold fewer). */
  dueCount: z.number().int(),
});
export type ReviewQueueResponse = z.infer<typeof reviewQueueResponseSchema>;

export const gradeRequestSchema = z
  .object({ grade: z.enum(reviewGrades), context: z.enum(reviewContexts).default("review") })
  .strict();
export type GradeRequest = z.input<typeof gradeRequestSchema>;

export const gradeResponseSchema = z.object({
  lemmaId: z.number().int(),
  intervalDays: z.number(),
  nextReviewAt: z.iso.datetime(),
});
export type GradeResponse = z.infer<typeof gradeResponseSchema>;

export const lookupRequestSchema = z.object({ tokenId: z.number().int().positive() }).strict();
export type LookupRequest = z.infer<typeof lookupRequestSchema>;

export const readingCompleteResponseSchema = z.object({
  timesRead: z.number().int(),
  completedAt: z.iso.datetime(),
  /** Greek words in this passage. */
  wordsInPassage: z.number().int(),
  /** Greek words the learner has read in total, this read-through included. */
  totalWordsRead: z.number().int(),
});
export type ReadingCompleteResponse = z.infer<typeof readingCompleteResponseSchema>;

export const addToReviewResponseSchema = z.object({
  lemmaId: z.number().int(),
  /** When the word will next be asked (now if it was newly added). */
  nextReviewAt: z.iso.datetime(),
  added: z.boolean(),
});
export type AddToReviewResponse = z.infer<typeof addToReviewResponseSchema>;
