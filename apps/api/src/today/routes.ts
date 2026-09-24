import { Hono } from "hono";
import type { AppEnv } from "../app";
import { requireUser } from "../session/require-user";
import { getToday } from "./queries";

export const todayRoutes = new Hono<AppEnv>().get("/today", requireUser, async (c) => {
  const { db, now } = c.var.deps;
  return c.json(await getToday(db, c.var.userId, now()));
});
