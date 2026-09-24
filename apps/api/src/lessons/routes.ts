import { idParamSchema, lessonProgressRequestSchema, type LessonProgress } from "@gbt/shared";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { ApiHttpError, notFound } from "../http/errors";
import { validBody, validParam } from "../http/validate";
import { requireUser } from "../session/require-user";
import { getLesson, recordLessonProgress } from "./queries";

export const lessonRoutes = new Hono<AppEnv>()
  .use("/lessons/*", requireUser)
  .get("/lessons/:id", async (c) => {
    const lesson = await getLesson(c.var.deps.db, validParam(c, "id", idParamSchema), c.var.userId);
    if (!lesson) throw notFound("Lesson");
    return c.json({ lesson });
  })
  .post("/lessons/:id/progress", async (c) => {
    const lessonId = validParam(c, "id", idParamSchema);
    const { step, completed } = await validBody(c, lessonProgressRequestSchema);
    const { db, now } = c.var.deps;
    const lesson = await getLesson(db, lessonId, c.var.userId);
    if (!lesson) throw notFound("Lesson");
    if (step >= lesson.steps.length) {
      throw new ApiHttpError(
        400,
        "validation_error",
        `This lesson has ${lesson.steps.length} steps`,
      );
    }
    const row = await recordLessonProgress(db, {
      userId: c.var.userId,
      lessonId,
      step,
      completed,
      now: now(),
    });
    const body: LessonProgress = {
      currentStep: row.currentStep,
      completedAt: row.completedAt?.toISOString() ?? null,
    };
    return c.json(body);
  });
