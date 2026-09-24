import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../app";
import { users } from "../db/schema";
import { ApiHttpError } from "../http/errors";
import { readSessionUserId } from "./cookie";

/** Rejects requests without a valid session cookie; otherwise sets `c.var.userId`. */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const id = readSessionUserId(c);
  const [user] = id
    ? await c.var.deps.db.select({ id: users.id }).from(users).where(eq(users.id, id))
    : [];
  if (!user) throw new ApiHttpError(401, "no_session", "Start a session first");
  c.set("userId", user.id);
  await next();
});
