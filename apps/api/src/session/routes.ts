import {
  onboardingRequestSchema,
  restoreSessionRequestSchema,
  updatePreferencesRequestSchema,
} from "@gbt/shared";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { ApiHttpError } from "../http/errors";
import { clientIp, tooManyRequests } from "../http/rate-limit";
import { validBody } from "../http/validate";
import { readSessionUserId, writeSessionCookie } from "./cookie";
import { requireUser } from "./require-user";
import {
  completeOnboarding,
  createRecoveryCode,
  createUser,
  findUser,
  findUserByRecoveryCode,
  toSessionResponse,
  updatePreferences,
} from "./users";

export const sessionRoutes = new Hono<AppEnv>()
  /** Returns the current anonymous user, creating one (and its cookie) on first visit. */
  .post("/session/anonymous", async (c) => {
    const { db, env } = c.var.deps;
    const existingId = readSessionUserId(c);
    const existing = existingId ? await findUser(db, existingId) : null;
    if (existing) return c.json(toSessionResponse(existing), 200);

    // Each new visitor is a users row, so creating them has its own, tighter per-IP budget.
    const { newSessions } = c.var.limits;
    const ip = clientIp(c);
    const now = c.var.deps.now().getTime();
    const wait = newSessions?.retryAfter(ip, now) ?? null;
    if (wait !== null) throw tooManyRequests(c, wait);

    const user = await createUser(db);
    newSessions?.record(ip, now);
    writeSessionCookie(c, env, user.id);
    return c.json(toSessionResponse(user), 201);
  })
  /**
   * Switches this browser to the learner who owns the recovery code (DECISIONS 027). Whatever
   * progress the browser had before stays with its old, now unreferenced, anonymous user.
   */
  .post("/session/restore", async (c) => {
    const { db, env, now } = c.var.deps;
    const { restoreFailures } = c.var.limits;
    const ip = clientIp(c);
    const at = now().getTime();
    const wait = restoreFailures.retryAfter(ip, at);
    if (wait !== null) throw tooManyRequests(c, wait);

    const { code } = await validBody(c, restoreSessionRequestSchema);
    const user = await findUserByRecoveryCode(db, code);
    if (!user) {
      restoreFailures.record(ip, at);
      throw new ApiHttpError(
        404,
        "recovery_code_not_found",
        "That code doesn’t match any saved progress. Check it and try again.",
      );
    }
    writeSessionCookie(c, env, user.id);
    return c.json(toSessionResponse(user), 200);
  })
  /** A new recovery code for the current learner, shown once; it replaces any earlier code. */
  .post("/me/recovery-code", requireUser, async (c) => {
    const { db, now } = c.var.deps;
    return c.json(await createRecoveryCode(db, c.var.userId, now()), 201);
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
    const user = await updatePreferences(c.var.deps.db, userId, body);
    if (!user) throw new ApiHttpError(401, "no_session", "Start a session first");
    return c.json(toSessionResponse(user));
  });
