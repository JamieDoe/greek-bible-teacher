import { todayQuerySchema } from "@gbt/shared";
import { Hono } from "hono";
import { ApiHttpError } from "../http/errors";
import type { AppEnv } from "../app";
import { requireUser } from "../session/require-user";
import { getToday } from "./queries";

export const todayRoutes = new Hono<AppEnv>().get("/today", requireUser, async (c) => {
  const query = todayQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    throw new ApiHttpError(400, "validation_error", "Invalid query", query.error.issues);
  }
  const { db, now } = c.var.deps;
  return c.json(await getToday(db, c.var.userId, now(), query.data.tz));
});
