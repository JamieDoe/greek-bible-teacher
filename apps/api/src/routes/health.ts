import type { HealthResponse } from "@gbt/shared";
import { Hono } from "hono";

export const healthRoutes = new Hono().get("/", (c) => {
  const body: HealthResponse = { status: "ok", service: "api", time: new Date().toISOString() };
  return c.json(body);
});
