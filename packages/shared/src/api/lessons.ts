import { z } from "zod";
import { experienceLevels } from "../learning/enums";

export const DAILY_MINUTE_OPTIONS = [5, 10, 15, 20, 30] as const;

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
  z.object({ kind: z.literal("vocab"), lemmaIds: z.array(z.number().int()) }),
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
  }),
});
export type TodayResponse = z.infer<typeof todayResponseSchema>;
