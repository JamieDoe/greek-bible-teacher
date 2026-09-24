import type { HealthResponse } from "@gbt/shared";
import { Hono } from "hono";

/** Returns 200 when the DB answers, 503 otherwise, so orchestrators can gate traffic on it. */
export function healthRoutes(pingDb: () => Promise<void>) {
  return new Hono().get("/", async (c) => {
    let dbOk = true;
    try {
      await pingDb();
    } catch (err) {
      dbOk = false;
      console.error("[api] health: database ping failed:", err);
    }
    const body: HealthResponse = {
      status: dbOk ? "ok" : "degraded",
      service: "api",
      db: dbOk ? "ok" : "unavailable",
      time: new Date().toISOString(),
    };
    return c.json(body, dbOk ? 200 : 503);
  });
}
