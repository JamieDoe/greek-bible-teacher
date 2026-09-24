import { apiErrorSchema, LEARNED_INTERVAL_DAYS, progressResponseSchema } from "@gbt/shared";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cookieFrom, importJohn, T0, testApp } from "../../test/fixtures";
import { lemmas, userWordProgress } from "../db/schema";

// T0 = 2026-03-01T09:00:00Z.
const { app, db, clock, close } = testApp();
let cookie = "";
let passageId = 0;
beforeAll(async () => {
  await importJohn(db);
  const [p] = await db.execute<{ id: number }>(
    sql`select id from passages order by curriculum_order limit 1`,
  );
  passageId = p!.id;
}, 60_000);
afterAll(close);
beforeEach(async () => {
  await db.execute(sql`truncate users cascade`);
  clock.now = T0;
  cookie = cookieFrom(await app.request("/session/anonymous", { method: "POST" }));
});

const at = (iso: string) => new Date(iso);
const post = (path: string, body?: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const progress = async (query = "") => {
  const res = await app.request(`/progress${query}`, { headers: { Cookie: cookie } });
  expect(res.status).toBe(200);
  return progressResponseSchema.parse(await res.json());
};
const lemmaId = async (lemma: string) =>
  (await db.select({ id: lemmas.id }).from(lemmas).where(eq(lemmas.lemma, lemma)))[0]!.id;

describe("GET /progress", () => {
  it("starts at zero with a zero-filled activity series ending today", async () => {
    const p = await progress("?days=7");
    expect(p).toMatchObject({
      words: { learned: 0, learning: 0, learnedThresholdDays: LEARNED_INTERVAL_DAYS },
      greekWordsRead: 0,
      passagesCompleted: 0,
      conceptsStudied: 0,
      reviews: { total: 0, correct: 0, last7Days: { total: 0, correct: 0 } },
    });
    expect(p.activity).toHaveLength(7);
    expect(p.activity.at(-1)).toEqual({ date: "2026-03-01", wordsRead: 0, reviews: 0 });
    expect(p.activity[0]?.date).toBe("2026-02-23");
  });

  it("counts Greek words read across read-throughs, re-reads included", async () => {
    await post(`/reading/${passageId}/complete`);
    await post(`/reading/${passageId}/complete`);
    const p = await progress();
    expect(p.greekWordsRead).toBe(2 * 61); // John 1:1–5 has 61 tokens
    expect(p.passagesCompleted).toBe(1);
    expect(p.activity.at(-1)?.wordsRead).toBe(122);
  });

  it("buckets activity by the learner's local day", async () => {
    // 23:30 UTC on 1 March is already 2 March in Auckland (UTC+13).
    clock.now = at("2026-03-01T23:30:00Z");
    await post(`/reading/${passageId}/complete`);
    const utc = await progress("?tz=UTC&days=7");
    const auckland = await progress("?tz=Pacific/Auckland&days=7");
    expect(utc.activity.at(-1)).toMatchObject({ date: "2026-03-01", wordsRead: 61 });
    expect(auckland.activity.at(-1)).toMatchObject({ date: "2026-03-02", wordsRead: 61 });
  });

  it("reports review accuracy overall and for the last 7 days", async () => {
    const logos = await lemmaId("λόγος");
    clock.now = at("2026-02-01T09:00:00Z"); // over a week ago
    await post(`/review/${logos}`, { grade: "again" });
    clock.now = T0;
    await post(`/review/${logos}`, { grade: "good" });
    await post(`/review/${logos}`, { grade: "easy" });
    const p = await progress();
    expect(p.reviews).toEqual({ total: 3, correct: 2, last7Days: { total: 2, correct: 2 } });
    expect(p.activity.at(-1)?.reviews).toBe(2);
  });

  it("counts a word as learned only once its interval reaches the threshold", async () => {
    const [logos, theos] = [await lemmaId("λόγος"), await lemmaId("θεός")];
    await post(`/review/${logos}`, { grade: "good" });
    await post(`/review/${theos}`, { grade: "good" });
    await db
      .update(userWordProgress)
      .set({ intervalDays: LEARNED_INTERVAL_DAYS })
      .where(eq(userWordProgress.lemmaId, theos));
    expect((await progress()).words).toMatchObject({ learned: 1, learning: 1 });
  });

  it.each(["?tz=Mars/Olympus", "?days=3", "?days=365", "?other=1"])("rejects %s", async (q) => {
    const res = await app.request(`/progress${q}`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("validation_error");
  });

  it("requires a session", async () => {
    expect((await app.request("/progress")).status).toBe(401);
  });
});
