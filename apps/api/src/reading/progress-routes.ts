import {
  idParamSchema,
  lookupRequestSchema,
  type PassageFamiliarityResponse,
  type ReadingCompleteResponse,
} from "@gbt/shared";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { ApiHttpError, notFound } from "../http/errors";
import { validBody, validParam } from "../http/validate";
import { requireUser } from "../session/require-user";
import {
  knownLemmasInPassage,
  lemmaOfTokenInPassage,
  passageExists,
  recordCompletion,
  recordLookup,
} from "./progress";

export const readingProgressRoutes = new Hono<AppEnv>()
  .get("/passages/:passageId/familiarity", requireUser, async (c) => {
    const passageId = validParam(c, "passageId", idParamSchema);
    const { db } = c.var.deps;
    if (!(await passageExists(db, passageId))) throw notFound("Passage");
    const body: PassageFamiliarityResponse = {
      knownLemmaIds: await knownLemmasInPassage(db, c.var.userId, passageId),
    };
    return c.json(body);
  })
  .use("/reading/*", requireUser)
  .post("/reading/:passageId/lookup", async (c) => {
    const passageId = validParam(c, "passageId", idParamSchema);
    const { tokenId } = await validBody(c, lookupRequestSchema);
    const { db, now } = c.var.deps;
    const lemmaId = await lemmaOfTokenInPassage(db, passageId, tokenId);
    if (lemmaId === null) {
      if (!(await passageExists(db, passageId))) throw notFound("Passage");
      throw new ApiHttpError(400, "validation_error", "That token is not in this passage");
    }
    await recordLookup(db, { userId: c.var.userId, passageId, lemmaId, now: now() });
    return c.body(null, 204);
  })
  .post("/reading/:passageId/complete", async (c) => {
    const passageId = validParam(c, "passageId", idParamSchema);
    const { db, now } = c.var.deps;
    if (!(await passageExists(db, passageId))) throw notFound("Passage");
    const row = await recordCompletion(db, { userId: c.var.userId, passageId, now: now() });
    const body: ReadingCompleteResponse = {
      timesRead: row.timesRead,
      completedAt: row.completedAt!.toISOString(),
      wordsInPassage: row.wordsInPassage,
      totalWordsRead: row.totalWordsRead,
    };
    return c.json(body);
  });
