import { z } from "zod";
import { reviewContexts, reviewGrades } from "../learning/enums";
import { partsOfSpeech } from "../morphology/categories";

export const reviewQueueQuerySchema = z
  .object({
    /** Review exactly these words (e.g. those looked up while reading), comma-separated ids. */
    lemmaIds: z
      .string()
      .regex(/^\d+(,\d+)*$/, "comma-separated lemma ids")
      .transform((s) => [...new Set(s.split(",").map(Number))])
      .pipe(z.array(z.number().int().positive()).max(50))
      .optional(),
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
  }),
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
});
export type ReadingCompleteResponse = z.infer<typeof readingCompleteResponseSchema>;
