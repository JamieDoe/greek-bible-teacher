import { apiErrorSchema, sessionResponseSchema } from "@gbt/shared";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cookieFrom, testApp } from "../../test/fixtures";
import { users } from "../db/schema";

const { app, db, close } = testApp();
afterAll(close);
beforeEach(() => db.execute(sql`truncate users cascade`));

const start = (cookie?: string) =>
  app.request("/session/anonymous", {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
  });

describe("POST /session/anonymous", () => {
  it("creates an anonymous user and sets an httpOnly cookie, without exposing the id", async () => {
    const res = await start();
    expect(res.status).toBe(201);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^gbt_uid=[0-9a-f-]{36};/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    const body = sessionResponseSchema.parse(await res.json());
    expect(body.user.disclosureLevel).toBe("beginner");
    expect(JSON.stringify(body)).not.toContain(cookieFrom(res).split("=")[1]!);
  });

  it("returns the same user when the cookie is sent back", async () => {
    const cookie = cookieFrom(await start());
    const res = await start(cookie);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await db.$count(users)).toBe(1);
  });

  it("creates a fresh user for an unknown or malformed cookie", async () => {
    expect((await start("gbt_uid=00000000-0000-4000-8000-000000000000")).status).toBe(201);
    expect((await start("gbt_uid=not-a-uuid")).status).toBe(201);
  });
});

describe("PATCH /me/preferences", () => {
  const patch = (body: unknown, cookie?: string) =>
    app.request("/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });

  it("remembers the disclosure level per user", async () => {
    const cookie = cookieFrom(await start());
    const res = await patch({ disclosureLevel: "advanced" }, cookie);
    expect(res.status).toBe(200);
    const again = sessionResponseSchema.parse(await (await start(cookie)).json());
    expect(again.user.disclosureLevel).toBe("advanced");
  });

  it("requires a session", async () => {
    const res = await patch({ disclosureLevel: "advanced" });
    expect(res.status).toBe(401);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("no_session");
  });

  it.each([{ disclosureLevel: "expert" }, { disclosureLevel: "advanced", extra: 1 }, {}])(
    "rejects invalid body %j",
    async (body) => {
      const cookie = cookieFrom(await start());
      const res = await patch(body, cookie);
      expect(res.status).toBe(400);
      expect(apiErrorSchema.parse(await res.json()).error.code).toBe("validation_error");
    },
  );

  it("rejects malformed JSON", async () => {
    const cookie = cookieFrom(await start());
    const res = await app.request("/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: "{",
    });
    expect(res.status).toBe(400);
  });
});
