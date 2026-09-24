import {
  apiErrorSchema,
  grammarConceptResponseSchema,
  grammarListResponseSchema,
  grammarProgressResponseSchema,
} from "@gbt/shared";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cookieFrom, GRAMMAR_BOOKS, importBooks, T0, testApp } from "../../test/fixtures";
import { grammarContent } from "../content/grammar";
import { seedGrammar } from "../content/seed-grammar";

const { app, db, clock, close } = testApp();
let cookie = "";
beforeAll(async () => {
  await importBooks(db, GRAMMAR_BOOKS);
  await seedGrammar(db, grammarContent);
}, 120_000);
afterAll(close);
beforeEach(async () => {
  await db.execute(sql`truncate users cascade`);
  clock.now = T0;
  cookie = cookieFrom(await app.request("/session/anonymous", { method: "POST" }));
});

const hours = (n: number) => new Date(T0.getTime() + n * 3_600_000);
const progress = (slug: string, body: unknown, withCookie = true) =>
  app.request(`/grammar/${slug}/progress`, {
    method: "POST",
    headers: { ...(withCookie ? { Cookie: cookie } : {}), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("GET /grammar", () => {
  it("lists the curriculum in order", async () => {
    const { concepts } = grammarListResponseSchema.parse(
      await (await app.request("/grammar")).json(),
    );
    expect(concepts.map((c) => c.slug)).toEqual(grammarContent.map((c) => c.slug));
    expect(concepts.map((c) => c.curriculumOrder)).toEqual(grammarContent.map((_, i) => i + 1));
  });
});

describe("GET /grammar/:slug", () => {
  it("returns the slice concept with its real examples highlighted", async () => {
    const res = await app.request("/grammar/article-and-case");
    expect(res.status).toBe(200);
    const { concept } = grammarConceptResponseSchema.parse(await res.json());
    expect(concept.title).toBe("The article and case: who is what");
    expect(
      concept.examples.map((e) => [e.displayRef, e.tokens.find((t) => t.isTarget)?.word]),
    ).toEqual([
      ["John 3:16", "θεὸς"],
      ["John 3:16", "κόσμον"],
      ["John 1:1", "ὁ"],
      ["John 1:1", "λόγος"],
      ["John 1:1", "τὸν"],
      ["John 1:1", "θεόν"],
      ["John 1:1", "θεὸς"],
    ]);
    expect(concept.previous?.slug).toBe("breathings-accents");
    expect(concept.next?.slug).toBe("eimi");
  });

  it("has no previous for the first concept", async () => {
    const { concept } = grammarConceptResponseSchema.parse(
      await (await app.request("/grammar/alphabet")).json(),
    );
    expect(concept.previous).toBeNull();
  });

  it("404s for an unknown slug and 400s for a malformed one", async () => {
    expect((await app.request("/grammar/no-such-thing")).status).toBe(404);
    const res = await app.request("/grammar/Bad_Slug");
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("validation_error");
  });
});

describe("grammar progress", () => {
  it("records introduced, then studied, and never goes backwards", async () => {
    expect((await progress("dative", { status: "introduced" })).status).toBe(200);
    clock.now = hours(1);
    const studied = await (await progress("dative", { status: "studied" })).json();
    expect(studied).toEqual({
      slug: "dative",
      status: "studied",
      studiedAt: hours(1).toISOString(),
    });

    clock.now = hours(2);
    const again = await (await progress("dative", { status: "introduced" })).json();
    expect(again).toEqual({ slug: "dative", status: "studied", studiedAt: hours(1).toISOString() });

    const res = await app.request("/grammar/progress", { headers: { Cookie: cookie } });
    expect(grammarProgressResponseSchema.parse(await res.json()).progress).toEqual([
      { slug: "dative", status: "studied", studiedAt: hours(1).toISOString() },
    ]);
  });

  it("validates input and requires a session", async () => {
    expect((await progress("dative", { status: "mastered" })).status).toBe(400);
    expect((await progress("dative", {})).status).toBe(400);
    expect((await progress("no-such-thing", { status: "studied" })).status).toBe(404);
    expect((await progress("dative", { status: "studied" }, false)).status).toBe(401);
    expect((await app.request("/grammar/progress")).status).toBe(401);
  });
});
