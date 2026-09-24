import { progressQuerySchema } from "@gbt/shared";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { ApiHttpError } from "../http/errors";
import { requireUser } from "../session/require-user";
import { getProgress } from "./queries";

export const progressRoutes = new Hono<AppEnv>().get("/progress", requireUser, async (c) => {
  const query = progressQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    throw new ApiHttpError(400, "validation_error", "Invalid query", query.error.issues);
  }
  const { db, now } = c.var.deps;
  return c.json(await getProgress(db, { userId: c.var.userId, ...query.data, now: now() }));
});
