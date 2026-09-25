import {
  type GrammarListResponse,
  type GrammarProgressResponse,
  grammarSlugSchema,
  updateGrammarProgressRequestSchema,
} from "@gbt/shared";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { notFound } from "../http/errors";
import { validBody, validParam } from "../http/validate";
import { requireUser } from "../session/require-user";
import { conceptIdBySlug, getConcept, listConcepts, listProgress, recordProgress } from "./queries";

export const grammarRoutes = new Hono<AppEnv>()
  .get("/grammar", async (c) => {
    const body: GrammarListResponse = { concepts: await listConcepts(c.var.deps.db) };
    return c.json(body);
  })
  .get("/grammar/progress", requireUser, async (c) => {
    const rows = await listProgress(c.var.deps.db, c.var.userId);
    const body: GrammarProgressResponse = {
      progress: rows.map((r) => ({ ...r, studiedAt: r.studiedAt?.toISOString() ?? null })),
    };
    return c.json(body);
  })
  .get("/grammar/:slug", async (c) => {
    const concept = await getConcept(c.var.deps.db, validParam(c, "slug", grammarSlugSchema));
    if (!concept) throw notFound("Grammar concept");
    return c.json({ concept });
  })
  .post("/grammar/:slug/progress", requireUser, async (c) => {
    const slug = validParam(c, "slug", grammarSlugSchema);
    const { status } = await validBody(c, updateGrammarProgressRequestSchema);
    const { db, now } = c.var.deps;
    const conceptId = await conceptIdBySlug(db, slug);
    if (conceptId === null) throw notFound("Grammar concept");
    const row = await recordProgress(db, { userId: c.var.userId, conceptId, status, now: now() });
    return c.json({ slug, status: row.status, studiedAt: row.studiedAt?.toISOString() ?? null });
  });
