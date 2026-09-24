import { z } from "zod";

/** A word counts as learned once its review interval reaches this many days. */
export const LEARNED_INTERVAL_DAYS = 21;

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const progressQuerySchema = z
  .object({
    /** IANA time zone for grouping activity by the learner's local day. */
    tz: z.string().max(64).refine(isTimeZone, "unknown time zone").default("UTC"),
    days: z.coerce.number().int().min(7).max(90).default(28),
  })
  .strict();
export type ProgressQuery = z.infer<typeof progressQuerySchema>;

export const progressResponseSchema = z.object({
  words: z.object({
    /** Interval ≥ LEARNED_INTERVAL_DAYS. */
    learned: z.number().int(),
    /** Scheduled, but not yet learned. */
    learning: z.number().int(),
    learnedThresholdDays: z.number().int(),
  }),
  /** Greek tokens read in finished read-throughs, re-reads included. */
  greekWordsRead: z.number().int(),
  passagesCompleted: z.number().int(),
  conceptsStudied: z.number().int(),
  reviews: z.object({
    total: z.number().int(),
    correct: z.number().int(),
    last7Days: z.object({ total: z.number().int(), correct: z.number().int() }),
  }),
  /** One entry per local day, oldest first, zero-filled. */
  activity: z.array(
    z.object({
      date: z.iso.date(),
      wordsRead: z.number().int(),
      reviews: z.number().int(),
    }),
  ),
});
export type ProgressResponse = z.infer<typeof progressResponseSchema>;
