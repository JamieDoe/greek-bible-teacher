import { idParamSchema, type PassagesResponse } from "@gbt/shared";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { notFound } from "../http/errors";
import { validParam } from "../http/validate";
import { getPassage, getTokenDetail, listPassages } from "./queries";

export const readingRoutes = new Hono<AppEnv>()
  .get("/passages", async (c) => {
    const body: PassagesResponse = { passages: await listPassages(c.var.deps.db) };
    return c.json(body);
  })
  .get("/passages/:id", async (c) => {
    const passage = await getPassage(c.var.deps.db, validParam(c, "id", idParamSchema));
    if (!passage) throw notFound("Passage");
    return c.json({ passage });
  })
  .get("/tokens/:id", async (c) => {
    const detail = await getTokenDetail(c.var.deps.db, validParam(c, "id", idParamSchema));
    if (!detail) throw notFound("Token");
    return c.json(detail);
  });
