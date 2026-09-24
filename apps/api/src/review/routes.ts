import {
  gradeRequestSchema,
  type GradeResponse,
  idParamSchema,
  reviewQueueQuerySchema,
  type ReviewQueueResponse,
} from "@gbt/shared";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { ApiHttpError } from "../http/errors";
import { validBody, validParam } from "../http/validate";
import { requireUser } from "../session/require-user";
import { gradeWord } from "./grade";
import { buildReviewQueue } from "./queue";

export const reviewRoutes = new Hono<AppEnv>()
  .use("/review/*", requireUser)
  .get("/review/queue", async (c) => {
    const query = reviewQueueQuerySchema.safeParse(c.req.query());
    if (!query.success) {
      throw new ApiHttpError(400, "validation_error", "Invalid query", query.error.issues);
    }
    const { db, now, rng } = c.var.deps;
    const body: ReviewQueueResponse = await buildReviewQueue(db, {
      userId: c.var.userId,
      now: now(),
      rng,
      lemmaIds: query.data.lemmaIds,
      mode: query.data.mode,
    });
    return c.json(body);
  })
  .post("/review/:lemmaId", async (c) => {
    const lemmaId = validParam(c, "lemmaId", idParamSchema);
    const { grade, context } = await validBody(c, gradeRequestSchema);
    const { db, now } = c.var.deps;
    const state = await gradeWord(db, {
      userId: c.var.userId,
      lemmaId,
      grade,
      context,
      now: now(),
    });
    const body: GradeResponse = {
      lemmaId,
      intervalDays: state.intervalDays,
      nextReviewAt: state.nextReviewAt.toISOString(),
    };
    return c.json(body);
  });
