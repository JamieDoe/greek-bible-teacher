import type { SourcesResponse } from "@gbt/shared";
import { asc } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { dataSources } from "../db/schema";

export const sourcesRoutes = new Hono<AppEnv>().get("/sources", async (c) => {
  const sources = await c.var.deps.db
    .select({
      key: dataSources.key,
      name: dataSources.name,
      version: dataSources.version,
      licence: dataSources.licence,
      attribution: dataSources.attribution,
      url: dataSources.url,
    })
    .from(dataSources)
    .orderBy(asc(dataSources.id));
  const body: SourcesResponse = { sources };
  return c.json(body);
});
