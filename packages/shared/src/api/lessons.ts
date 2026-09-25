import { z } from "zod";
import { experienceLevels } from "../learning/enums";

import { DAILY_MINUTE_OPTIONS } from "./daily-minutes";

export { DAILY_MINUTE_OPTIONS };

export const onboardingRequestSchema = z
  .object({
    experienceLevel: z.enum(experienceLevels),
    dailyMinutes: z.union(DAILY_MINUTE_OPTIONS.map((m) => z.literal(m))),
  })
  .strict();
export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;

const snippetToken = z.object({
  before: z.string(),
  word: z.string(),
  after: z.string(),
  isTarget: z.boolean(),
});

/** The daily loop, in order. Steps are derived from a lesson's items (see DECISIONS 018). */
export const lessonStepSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("review_due") }),
  z.object({
    kind: z.literal("vocab"),
    lemmaIds: z.array(z.number().int()),
    /** The same words' dictionary forms, in order (Today lists them). */
    words: z.array(z.string()),
  }),
  z.object({ kind: z.literal("grammar"), slug: z.string(), title: z.string() }),
  z.object({ kind: z.literal("reading"), passageId: z.number().int() }),
  z.object({
    kind: z.literal("investigate"),
    conceptSlug: z.string(),
    conceptTitle: z.string(),
    /** Verses of the passage with the forms that show today's concept marked. */
    verses: z.array(
      z.object({
        displayRef: z.string(),
        tokens: z.array(snippetToken),
        notes: z.array(z.object({ word: z.string(), note: z.string() })),
      }),
    ),
  }),
  z.object({ kind: z.literal("review_recall"), lemmaIds: z.array(z.number().int()) }),
  z.object({ kind: z.literal("reread"), passageId: z.number().int() }),
]);
export type LessonStep = z.infer<typeof lessonStepSchema>;

export const lessonProgressSchema = z.object({
  currentStep: z.number().int(),
  completedAt: z.iso.datetime().nullable(),
});
export type LessonProgress = z.infer<typeof lessonProgressSchema>;

export const lessonResponseSchema = z.object({
  lesson: z.object({
    id: z.number().int(),
    number: z.number().int(),
    title: z.string(),
    passage: z.object({ id: z.number().int(), title: z.string() }),
    steps: z.array(lessonStepSchema),
    progress: lessonProgressSchema.nullable(),
  }),
});
export type LessonResponse = z.infer<typeof lessonResponseSchema>;

export const lessonProgressRequestSchema = z
  .object({ step: z.number().int().min(0), completed: z.boolean().default(false) })
  .strict();
export type LessonProgressRequest = z.input<typeof lessonProgressRequestSchema>;

export const todayResponseSchema = z.object({
  onboarded: z.boolean(),
  dailyMinutes: z.number().int().nullable(),
  dueCount: z.number().int(),
  /** The first lesson not yet completed, or null when all are done. */
  lesson: z
    .object({
      id: z.number().int(),
      number: z.number().int(),
      title: z.string(),
      stepCount: z.number().int(),
      currentStep: z.number().int(),
      started: z.boolean(),
    })
    .nullable(),
  /** The most recently completed lesson. */
  lastCompleted: z
    .object({
      id: z.number().int(),
      number: z.number().int(),
      title: z.string(),
      completedAt: z.iso.datetime(),
    })
    .nullable(),
  concept: z.object({ slug: z.string(), title: z.string(), summarySimple: z.string() }).nullable(),
  passage: z.object({ id: z.number().int(), title: z.string() }).nullable(),
  progress: z.object({
    wordsInReview: z.number().int(),
    passagesCompleted: z.number().int(),
    conceptsStudied: z.number().int(),
    lessonsCompleted: z.number().int(),
    /** Words learned (interval at least LEARNED_INTERVAL_DAYS). */
    wordsLearned: z.number().int(),
    greekWordsRead: z.number().int(),
  }),
  /** Days with any review or finished reading, in the learner's time zone. */
  practice: z.object({
    daysPractised: z.number().int(),
    /** Monday–Sunday of the current week. */
    week: z.array(z.object({ date: z.iso.date(), practised: z.boolean(), today: z.boolean() })),
  }),
  /** How much of the current passage the learner already knows (words in review). */
  passageKnown: z
    .object({ known: z.number().int(), total: z.number().int(), firstLine: z.string() })
    .nullable(),
  /** A few words due for review now (desktop Today). */
  dueWords: z.array(
    z.object({ lemmaId: z.number().int(), lemma: z.string(), gloss: z.string().nullable() }),
  ),
});

export const todayQuerySchema = z
  .object({
    tz: z
      .string()
      .max(64)
      .refine((tz) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      }, "unknown time zone")
      .default("UTC"),
  })
  .strict();

export const lessonsListResponseSchema = z.object({
  lessons: z.array(
    z.object({
      id: z.number().int(),
      number: z.number().int(),
      title: z.string(),
      passageTitle: z.string(),
      conceptTitle: z.string().nullable(),
      status: z.enum(["not_started", "in_progress", "completed"]),
    }),
  ),
});
export type LessonsListResponse = z.infer<typeof lessonsListResponseSchema>;
export type TodayResponse = z.infer<typeof todayResponseSchema>;
