import { apiErrorSchema, healthResponseSchema, seededRng } from "@gbt/shared";
import { afterAll, describe, expect, inject, it } from "vitest";
import { createApp } from "./app";
import { createDb } from "./db/client";
import { parseEnv } from "./env";

const WEB_ORIGIN = "http://localhost:3000";
const env = parseEnv({ NODE_ENV: "test", WEB_ORIGIN, DATABASE_URL: inject("testDatabaseUrl") });
const { db, client } = createDb(env.DATABASE_URL, { max: 1 });
afterAll(() => client.end());
const base = { env, db, now: () => new Date(), rng: seededRng(1) };
const app = createApp({ ...base, pingDb: async () => {} });

describe("GET /health", () => {
  it("returns ok when the database answers", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = healthResponseSchema.parse(await res.json());
    expect(body).toMatchObject({ status: "ok", db: "ok" });
  });

  it("returns 503 degraded when the database is unreachable", async () => {
    const down = createApp({
      ...base,
      pingDb: () => Promise.reject(new Error("connection refused")),
    });
    const res = await down.request("/health");
    expect(res.status).toBe(503);
    const body = healthResponseSchema.parse(await res.json());
    expect(body).toMatchObject({ status: "degraded", db: "unavailable" });
  });
});

describe("unknown routes", () => {
  it("return 404 in the shared error shape", async () => {
    const res = await app.request("/nope");
    expect(res.status).toBe(404);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("not_found");
  });
});

describe("CORS", () => {
  const preflight = (origin: string) =>
    app.request("/health", {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
    });

  it("allows the configured web origin with credentials", async () => {
    const res = await preflight(WEB_ORIGIN);
    expect(res.headers.get("access-control-allow-origin")).toBe(WEB_ORIGIN);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("does not allow other origins", async () => {
    const res = await preflight("https://evil.example");
    expect(res.headers.get("access-control-allow-origin")).not.toBe("https://evil.example");
  });
});
