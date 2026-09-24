import type { ApiError } from "@gbt/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import type { Env } from "./env";
import { healthRoutes } from "./routes/health";

export interface AppDeps {
  /** Resolves when the database answers a trivial query. */
  pingDb: () => Promise<void>;
}

export function createApp(env: Env, deps: AppDeps) {
  const app = new Hono();

  if (env.NODE_ENV !== "test") app.use(logger());

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      maxAge: 600,
    }),
  );

  app.route("/health", healthRoutes(deps.pingDb));

  app.notFound((c) => {
    const body: ApiError = { error: { code: "not_found", message: "Not found" } };
    return c.json(body, 404);
  });

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      const body: ApiError = { error: { code: "http_error", message: err.message } };
      return c.json(body, err.status);
    }
    console.error(`[api] ${c.req.method} ${c.req.path} failed:`, err);
    const body: ApiError = {
      error: { code: "internal_error", message: "Something went wrong. Please try again." },
    };
    return c.json(body, 500);
  });

  return app;
}
