import { apiErrorSchema, seededRng } from "@gbt/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createApp } from "../app";
import { createDb } from "../db/client";
import { parseEnv } from "../env";
import { clientIp, WindowCounter } from "./rate-limit";

const T0 = new Date("2026-03-01T09:00:00Z").getTime();

describe("WindowCounter", () => {
  it("allows `limit` hits per window, then says how long to wait", () => {
    const counter = new WindowCounter(2, 60_000);
    counter.record("a", T0);
    expect(counter.retryAfter("a", T0 + 1_000)).toBeNull();
    counter.record("a", T0 + 1_000);
    expect(counter.retryAfter("a", T0 + 1_000)).toBe(59);
    expect(counter.retryAfter("a", T0 + 59_500)).toBe(1);
    // Other keys have their own budget; a new window starts afresh.
    expect(counter.retryAfter("b", T0 + 1_000)).toBeNull();
    expect(counter.retryAfter("a", T0 + 60_000)).toBeNull();
  });

  it("forgets expired windows", () => {
    const counter = new WindowCounter(1, 1_000);
    counter.record("a", T0);
    counter.record("b", T0 + 2_000); // prunes "a"
    expect(counter.retryAfter("a", T0 + 500)).toBeNull();
    expect(counter.retryAfter("b", T0 + 2_500)).toBe(1);
  });
});

describe("clientIp", () => {
  const ipOf = async (headers: Record<string, string>) => {
    const app = new Hono().get("/", (c) => c.text(clientIp(c)));
    return (await app.request("/", { headers })).text();
  };

  it("uses the last X-Forwarded-For entry, which the nearest proxy appended", async () => {
    expect(await ipOf({ "X-Forwarded-For": "203.0.113.7" })).toBe("203.0.113.7");
    // A client-supplied value on the left can't choose the key.
    expect(await ipOf({ "X-Forwarded-For": "1.2.3.4, 203.0.113.7" })).toBe("203.0.113.7");
    expect(await ipOf({ "X-Forwarded-For": " 203.0.113.7 , " })).toBe("203.0.113.7");
  });

  it("falls back when there is no header and no socket", async () => {
    expect(await ipOf({})).toBe("unknown");
  });
});

describe("rate limits in the app", () => {
  const WEB_ORIGIN = "http://localhost:3000";
  const env = parseEnv({
    NODE_ENV: "test",
    WEB_ORIGIN,
    DATABASE_URL: inject("testDatabaseUrl"),
    RATE_LIMIT_PER_MINUTE: "3",
    NEW_SESSIONS_PER_HOUR: "2",
  });
  const { db, client } = createDb(env.DATABASE_URL, { max: 1, quiet: true });
  afterAll(() => client.end());
  const clock = { now: T0 };
  const newApp = () =>
    createApp({
      env,
      db,
      pingDb: async () => {},
      now: () => new Date(clock.now),
      rng: seededRng(1),
    });
  const from = (ip: string, init: RequestInit = {}) => ({
    ...init,
    headers: { "X-Forwarded-For": ip, Origin: WEB_ORIGIN },
  });

  beforeEach(async () => {
    clock.now = T0;
    await db.execute(sql`truncate users cascade`);
  });

  it("answers 429 with Retry-After once an IP spends its per-minute budget", async () => {
    const app = newApp();
    for (let i = 0; i < 3; i++) {
      expect((await app.request("/nowhere", from("203.0.113.7"))).status).toBe(404);
    }
    const limited = await app.request("/nowhere", from("203.0.113.7"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect(limited.headers.get("Access-Control-Allow-Origin")).toBe(WEB_ORIGIN);
    expect(apiErrorSchema.parse(await limited.json()).error.code).toBe("rate_limited");

    // Other clients are unaffected; health checks never count; the budget renews each minute.
    expect((await app.request("/nowhere", from("198.51.100.1"))).status).toBe(404);
    expect((await app.request("/health", from("203.0.113.7"))).status).toBe(200);
    clock.now = T0 + 60_000;
    expect((await app.request("/nowhere", from("203.0.113.7"))).status).toBe(404);
  });

  it("limits new anonymous users per IP, but not returning ones", async () => {
    const app = newApp();
    const create = () => app.request("/session/anonymous", from("203.0.113.7", { method: "POST" }));
    const first = await create();
    expect(first.status).toBe(201);
    const cookie = first.headers.get("set-cookie")!.split(";")[0]!;
    expect((await create()).status).toBe(201);

    clock.now = T0 + 60_000; // a fresh per-minute budget, same hour
    const third = await create();
    expect(third.status).toBe(429);
    expect(third.headers.get("Retry-After")).toBe("3540");
    const [row] = await db.execute<{ n: number }>(sql`select count(*)::int as n from users`);
    expect(row?.n).toBe(2);

    // A learner who already has a session is still recognised.
    const returning = await app.request("/session/anonymous", {
      method: "POST",
      headers: { "X-Forwarded-For": "203.0.113.7", Cookie: cookie },
    });
    expect(returning.status).toBe(200);
  });
});
