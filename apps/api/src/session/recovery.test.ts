import { apiErrorSchema, recoveryCodeResponseSchema, sessionResponseSchema } from "@gbt/shared";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cookieFrom, T0, testApp } from "../../test/fixtures";
import { users } from "../db/schema";

const { app, db, clock, close } = testApp();
afterAll(close);

// Each test uses its own client address, so the per-IP failure budget doesn't leak between tests.
let ip = 0;
let from = "";
beforeEach(async () => {
  await db.execute(sql`truncate users cascade`);
  clock.now = T0;
  from = `203.0.113.${++ip}`;
});

const post = (path: string, { cookie, body }: { cookie?: string; body?: unknown } = {}) =>
  app.request(path, {
    method: "POST",
    headers: {
      "X-Forwarded-For": from,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** A learner who has onboarded, i.e. has progress worth keeping. */
async function learner() {
  const cookie = cookieFrom(await post("/session/anonymous"));
  await post("/me/onboarding", {
    cookie,
    body: { experienceLevel: "beginner", dailyMinutes: 15 },
  });
  return cookie;
}

const newCode = async (cookie: string) => {
  const res = await post("/me/recovery-code", { cookie });
  expect(res.status).toBe(201);
  return recoveryCodeResponseSchema.parse(await res.json());
};

const restore = (code: string, cookie?: string) =>
  post("/session/restore", { cookie, body: { code } });

describe("POST /me/recovery-code", () => {
  it("returns a formatted code once and stores only its hash", async () => {
    const cookie = await learner();
    const { code, createdAt } = await newCode(cookie);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
    expect(createdAt).toBe(T0.toISOString());

    const [row] = await db.select().from(users);
    expect(row!.recoveryCodeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(code.replaceAll("-", ""));

    // The session reports that a code exists (and when), never the code.
    const session = sessionResponseSchema.parse(
      await (await post("/session/anonymous", { cookie })).json(),
    );
    expect(session.user.recoveryCodeCreatedAt).toBe(T0.toISOString());
    expect(JSON.stringify(session)).not.toContain(code);
  });

  it("replaces the previous code", async () => {
    const cookie = await learner();
    const first = await newCode(cookie);
    const second = await newCode(cookie);
    expect(second.code).not.toBe(first.code);
    expect((await restore(first.code)).status).toBe(404);
    expect((await restore(second.code)).status).toBe(200);
  });

  it("requires a session", async () => {
    const res = await post("/me/recovery-code");
    expect(res.status).toBe(401);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("no_session");
  });
});

describe("POST /session/restore", () => {
  it("moves a new browser onto the learner's progress", async () => {
    const owner = await learner();
    const [original] = await db.select({ id: users.id }).from(users);
    const { code } = await newCode(owner);

    // Another browser, which already has its own (not onboarded) anonymous user.
    const other = cookieFrom(await post("/session/anonymous"));
    const res = await restore(code.toLowerCase().replaceAll("-", " "), other);
    expect(res.status).toBe(200);
    const body = sessionResponseSchema.parse(await res.json());
    expect(body.user).toMatchObject({ onboarded: true, dailyMinutes: 15 });

    const restored = cookieFrom(res);
    expect(restored).toBe(`gbt_uid=${original!.id}`);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/);
    // The browser now carries the original learner.
    const again = sessionResponseSchema.parse(
      await (await post("/session/anonymous", { cookie: restored })).json(),
    );
    expect(again.user.onboarded).toBe(true);
  });

  it("works from a browser with no session at all, and keeps the code valid", async () => {
    const { code } = await newCode(await learner());
    expect((await restore(code)).status).toBe(200);
    expect((await restore(code)).status).toBe(200); // e.g. a second device
  });

  it("rejects a code that matches nobody, and one that can't be a code", async () => {
    await newCode(await learner());
    const wrong = await restore("0000-0000-0000-0000");
    expect(wrong.status).toBe(404);
    expect(wrong.headers.get("set-cookie")).toBeNull();
    expect(apiErrorSchema.parse(await wrong.json()).error.code).toBe("recovery_code_not_found");

    for (const body of [{ code: "not a code" }, { code: 42 }, {}, { code: "", extra: 1 }]) {
      const res = await post("/session/restore", { body });
      expect(res.status).toBe(400);
      expect(apiErrorSchema.parse(await res.json()).error.code).toBe("validation_error");
    }
  });

  it("stops guessing after 10 failures an hour from one address", async () => {
    const { code } = await newCode(await learner());
    for (let i = 0; i < 10; i++) {
      expect((await restore(`0000-0000-0000-${String(i).padStart(4, "0")}`)).status).toBe(404);
    }
    const blocked = await restore(code); // even the right code waits
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("3600");

    clock.now = new Date(T0.getTime() + 3_600_000);
    expect((await restore(code)).status).toBe(200);
  });

  it("doesn't count successful restores against the budget", async () => {
    const { code } = await newCode(await learner());
    for (let i = 0; i < 12; i++) expect((await restore(code)).status).toBe(200);
  });

  it("deletes nothing: the browser's previous anonymous user is left as it was", async () => {
    const { code } = await newCode(await learner());
    const other = cookieFrom(await post("/session/anonymous"));
    await restore(code, other);
    const otherId = other.split("=")[1]!;
    expect(await db.$count(users, eq(users.id, otherId))).toBe(1);
  });
});
