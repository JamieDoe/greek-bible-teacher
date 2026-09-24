import {
  passageFamiliarityResponseSchema,
  passagesResponseSchema,
  passageResponseSchema,
  readingCompleteResponseSchema,
} from "@gbt/shared";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cookieFrom, importJohn, T0, testApp } from "../../test/fixtures";
import { tokens, userReadingProgress, userWordProgress, verses } from "../db/schema";

const { app, db, clock, close } = testApp();
let cookie = "";
let passageId = 0;
let logosTokenId = 0;
let logosLemmaId = 0;

beforeAll(async () => {
  await importJohn(db);
  const { passages } = passagesResponseSchema.parse(await (await app.request("/passages")).json());
  passageId = passages[0]!.id;
  const { passage } = passageResponseSchema.parse(
    await (await app.request(`/passages/${passageId}`)).json(),
  );
  const logos = passage.verses[0]!.tokens[4]!;
  logosTokenId = logos.id;
  logosLemmaId = logos.lemma.id;
}, 60_000);
afterAll(close);
beforeEach(async () => {
  await db.execute(sql`truncate users cascade`);
  clock.now = T0;
  cookie = cookieFrom(await app.request("/session/anonymous", { method: "POST" }));
});

const hours = (n: number) => new Date(T0.getTime() + n * 3_600_000);
const post = (path: string, body?: unknown, withCookie = true) =>
  app.request(path, {
    method: "POST",
    headers: { ...(withCookie ? { Cookie: cookie } : {}), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const progressFor = async (lemmaId: number) =>
  (await db.select().from(userWordProgress).where(eq(userWordProgress.lemmaId, lemmaId)))[0];

describe("POST /reading/:passageId/lookup", () => {
  it("counts the lookup for the word and the passage without scheduling it", async () => {
    const res = await post(`/reading/${passageId}/lookup`, { tokenId: logosTokenId });
    expect(res.status).toBe(204);
    expect(await progressFor(logosLemmaId)).toMatchObject({
      lookupsCount: 1,
      nextReviewAt: null,
      correctCount: 0,
      incorrectCount: 0,
    });
    const [reading] = await db.select().from(userReadingProgress);
    expect(reading).toMatchObject({ tokensLookedUp: 1, lastReadAt: T0, timesRead: 0 });
  });

  it("nudges a scheduled word toward earlier review, but is not a failed review", async () => {
    await post(`/review/${logosLemmaId}`, { grade: "good" }); // due in 24h
    await post(`/reading/${passageId}/lookup`, { tokenId: logosTokenId });

    expect(await progressFor(logosLemmaId)).toMatchObject({
      nextReviewAt: hours(12),
      intervalDays: 1,
      correctCount: 1,
      incorrectCount: 0,
      lookupsCount: 1,
    });
  });

  it("rejects a token outside the passage", async () => {
    const [outside] = await db
      .select({ id: tokens.id })
      .from(tokens)
      .innerJoin(verses, eq(verses.id, tokens.verseId))
      .where(eq(verses.ref, "JHN 3:16"))
      .limit(1);
    const res = await post(`/reading/${passageId}/lookup`, { tokenId: outside!.id });
    expect(res.status).toBe(400);
  });

  it.each([
    [{}, 400],
    [{ tokenId: "x" }, 400],
    [{ tokenId: 1, extra: 1 }, 400],
  ])("rejects body %j", async (body, status) => {
    expect((await post(`/reading/${passageId}/lookup`, body)).status).toBe(status);
  });

  it("404s for an unknown passage and 401s without a session", async () => {
    expect((await post(`/reading/999999/lookup`, { tokenId: logosTokenId })).status).toBe(404);
    expect(
      (await post(`/reading/${passageId}/lookup`, { tokenId: logosTokenId }, false)).status,
    ).toBe(401);
  });
});

describe("POST /reading/:passageId/complete", () => {
  it("counts read-throughs and keeps the first completion date", async () => {
    const first = readingCompleteResponseSchema.parse(
      await (await post(`/reading/${passageId}/complete`)).json(),
    );
    expect(first).toEqual({
      timesRead: 1,
      completedAt: T0.toISOString(),
      wordsInPassage: 61,
      totalWordsRead: 61,
    });

    clock.now = hours(5);
    const second = readingCompleteResponseSchema.parse(
      await (await post(`/reading/${passageId}/complete`)).json(),
    );
    expect(second).toEqual({
      timesRead: 2,
      completedAt: T0.toISOString(),
      wordsInPassage: 61,
      totalWordsRead: 122,
    });
    const [row] = await db.select().from(userReadingProgress);
    expect(row?.lastReadAt).toEqual(hours(5));
  });

  it("404s for an unknown passage", async () => {
    expect((await post(`/reading/999999/complete`)).status).toBe(404);
  });
});

describe("GET /passages/:id/familiarity", () => {
  it("lists the passage's lemmas the learner has in review", async () => {
    const get = async () =>
      passageFamiliarityResponseSchema.parse(
        await (
          await app.request(`/passages/${passageId}/familiarity`, { headers: { Cookie: cookie } })
        ).json(),
      );
    expect((await get()).knownLemmaIds).toEqual([]);
    await post(`/review/${logosLemmaId}`, { grade: "good" });
    expect((await get()).knownLemmaIds).toEqual([logosLemmaId]);
  });

  it("requires a session and a real passage", async () => {
    expect((await app.request(`/passages/${passageId}/familiarity`)).status).toBe(401);
    const res = await app.request("/passages/999999/familiarity", { headers: { Cookie: cookie } });
    expect(res.status).toBe(404);
  });
});
