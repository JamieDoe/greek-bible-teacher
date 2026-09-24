import { onboardingRequestSchema, updatePreferencesRequestSchema } from "@gbt/shared";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { ApiHttpError } from "../http/errors";
import { validBody } from "../http/validate";
import { readSessionUserId, writeSessionCookie } from "./cookie";
import { requireUser } from "./require-user";
import {
  completeOnboarding,
  createUser,
  findUser,
  setDisclosureLevel,
  toSessionResponse,
} from "./users";

export const sessionRoutes = new Hono<AppEnv>()
  /** Returns the current anonymous user, creating one (and its cookie) on first visit. */
  .post("/session/anonymous", async (c) => {
    const { db, env } = c.var.deps;
    const existingId = readSessionUserId(c);
    const existing = existingId ? await findUser(db, existingId) : null;
    if (existing) return c.json(toSessionResponse(existing), 200);

    const user = await createUser(db);
    writeSessionCookie(c, env, user.id);
    return c.json(toSessionResponse(user), 201);
  })
  .post("/me/onboarding", requireUser, async (c) => {
    const answers = await validBody(c, onboardingRequestSchema);
    const { db, now } = c.var.deps;
    const user = await completeOnboarding(db, c.var.userId, answers, now());
    return c.json(toSessionResponse(user!));
  })
  .patch("/me/preferences", async (c) => {
    const userId = readSessionUserId(c);
    if (!userId) throw new ApiHttpError(401, "no_session", "Start a session first");
    const body = await validBody(c, updatePreferencesRequestSchema);
    const user = await setDisclosureLevel(c.var.deps.db, userId, body.disclosureLevel);
    if (!user) throw new ApiHttpError(401, "no_session", "Start a session first");
    return c.json(toSessionResponse(user));
  });
