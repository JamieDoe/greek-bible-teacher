import type { ApiError, Rng } from "@gbt/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import type { Db } from "./db/client";
import type { Env } from "./env";
import { ApiHttpError } from "./http/errors";
import { readingProgressRoutes } from "./reading/progress-routes";
import { readingRoutes } from "./reading/routes";
import { reviewRoutes } from "./review/routes";
import { healthRoutes } from "./routes/health";
import { sessionRoutes } from "./session/routes";
import { sourcesRoutes } from "./sources/routes";

export interface AppDeps {
  env: Env;
  db: Db;
  /** Resolves when the database answers a trivial query. */
  pingDb: () => Promise<void>;
  /** Injected so tests can fix the date and the shuffles. */
  now: () => Date;
  rng: Rng;
}

/** Hono generics for route modules: dependencies are available as `c.var.deps`. */
export interface AppEnv {
  Variables: { deps: AppDeps; userId: string };
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  if (deps.env.NODE_ENV !== "test") app.use(logger());

  app.use(
    cors({
      origin: deps.env.WEB_ORIGIN,
      credentials: true,
      allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      maxAge: 600,
    }),
  );
  app.use(async (c, next) => {
    c.set("deps", deps);
    await next();
  });

  app.route("/health", healthRoutes(deps.pingDb));
  app.route("/", sessionRoutes);
  app.route("/", readingRoutes);
  app.route("/", readingProgressRoutes);
  app.route("/", reviewRoutes);
  app.route("/", sourcesRoutes);

  app.notFound((c) => {
    const body: ApiError = { error: { code: "not_found", message: "Not found" } };
    return c.json(body, 404);
  });

  app.onError((err, c) => {
    if (err instanceof ApiHttpError) {
      const body: ApiError = {
        error: { code: err.code, message: err.message, details: err.details },
      };
      return c.json(body, err.status);
    }
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
