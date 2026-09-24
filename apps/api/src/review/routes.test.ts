import {
  apiErrorSchema,
  gradeResponseSchema,
  reviewQueueResponseSchema,
  sessionResponseSchema,
} from "@gbt/shared";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cookieFrom, importJohn, T0, testApp } from "../../test/fixtures";
import { lemmas, reviewEvents, userWordProgress } from "../db/schema";

const { app, db, clock, close } = testApp();
let cookie = "";
beforeAll(() => importJohn(db), 60_000);
afterAll(close);
beforeEach(async () => {
  await db.execute(sql`truncate users cascade`);
  clock.now = T0;
  const res = await app.request("/session/anonymous", { method: "POST" });
  sessionResponseSchema.parse(await res.json());
  cookie = cookieFrom(res);
});

const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);
const days = (n: number) => new Date(T0.getTime() + n * 86_400_000);

async function queue(query = "") {
  const res = await app.request(`/review/queue${query}`, { headers: { Cookie: cookie } });
  expect(res.status).toBe(200);
  return reviewQueueResponseSchema.parse(await res.json());
}
const grade = (lemmaId: number, body: unknown) =>
  app.request(`/review/${lemmaId}`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
async function lemmaId(lemma: string) {
  const [row] = await db.select({ id: lemmas.id }).from(lemmas).where(eq(lemmas.lemma, lemma));
  return row!.id;
}

describe("GET /review/queue", () => {
  it("requires a session", async () => {
    const res = await app.request("/review/queue");
    expect(res.status).toBe(401);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("no_session");
  });

  it("gives a new learner the five most frequent words of the current passage", async () => {
    // Frequencies here are John-only (the test imports one book), so derive the expectation.
    const expected = await db.execute<{ lemma: string }>(sql`
      select distinct l.lemma, l.nt_frequency, l.id from tokens t
      join verses v on v.id = t.verse_id join lemmas l on l.id = t.lemma_id
      where v.ref in ('JHN 1:1','JHN 1:2','JHN 1:3','JHN 1:4','JHN 1:5') and l.gloss is not null
      order by l.nt_frequency desc, l.id limit 5`);
    const q = await queue();
    expect(q.dueCount).toBe(0);
    expect(q.items.map((i) => i.lemma.lemma)).toEqual(expected.map((r) => r.lemma));
    expect(q.items[0]!.lemma.lemma).toBe("ὁ");
    expect(q.items.every((i) => i.kind === "new" && i.exercise.type === "gloss")).toBe(true);
  });

  it("builds four distinct options containing the answer", async () => {
    for (const item of (await queue()).items) {
      const { options, answerIndex } = item.exercise;
      expect(options[answerIndex]).toBe(item.lemma.gloss);
      expect(new Set(options).size).toBe(4);
    }
  });

  it("takes distractors from the same part of speech when there are enough", async () => {
    const q = await queue(`?lemmaIds=${await lemmaId("λόγος")},${await lemmaId("εἰμί")}`);
    for (const item of q.items) {
      const { options, answerIndex } = item.exercise;
      for (const option of options.filter((_, i) => i !== answerIndex)) {
        const rows = await db
          .select({ pos: lemmas.partOfSpeech })
          .from(lemmas)
          .where(eq(lemmas.gloss, option));
        expect(rows.map((r) => r.pos)).toContain(item.lemma.partOfSpeech);
      }
    }
  });

  it("returns exactly the requested words (e.g. those looked up), skipping unknown ids", async () => {
    const [logos, arche] = [await lemmaId("λόγος"), await lemmaId("ἀρχή")];
    const q = await queue(`?lemmaIds=${arche},${logos},999999`);
    expect(q.items.map((i) => [i.lemma.lemma, i.kind])).toEqual([
      ["ἀρχή", "lookedUp"],
      ["λόγος", "lookedUp"],
    ]);
  });

  it.each(["?lemmaIds=abc", "?lemmaIds=1,,2", "?other=1"])("rejects %s", async (query) => {
    const res = await app.request(`/review/queue${query}`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("validation_error");
  });
});

describe("POST /review/:lemmaId", () => {
  it("schedules a correct first review for tomorrow and logs the event", async () => {
    const id = await lemmaId("λόγος");
    const res = await grade(id, { grade: "good" });
    expect(res.status).toBe(200);
    expect(gradeResponseSchema.parse(await res.json())).toEqual({
      lemmaId: id,
      intervalDays: 1,
      nextReviewAt: days(1).toISOString(),
    });

    const [progress] = await db
      .select()
      .from(userWordProgress)
      .where(eq(userWordProgress.lemmaId, id));
    expect(progress).toMatchObject({ correctCount: 1, incorrectCount: 0, lastReviewedAt: T0 });
    const events = await db.select().from(reviewEvents).where(eq(reviewEvents.lemmaId, id));
    expect(events).toEqual([
      expect.objectContaining({ grade: "good", context: "review", reviewedAt: T0 }),
    ]);
  });

  it("keeps a scheduled word out of the queue until it is due, then serves it in context", async () => {
    const id = await lemmaId("λόγος");
    await grade(id, { grade: "good" });

    expect((await queue()).items.map((i) => i.lemmaId)).not.toContain(id);

    clock.now = days(1);
    const q = await queue();
    expect(q.dueCount).toBe(1);
    expect(q.items[0]).toMatchObject({ lemmaId: id, kind: "due" });
    // Recalled once already, so it is now asked in its verse.
    expect(q.items[0]!.exercise.type).toBe("context");
    const ctx = q.items[0]!.exercise.context!;
    expect(ctx.displayRef).toBe("John 1:1");
    expect(ctx.tokens.filter((t) => t.isTarget).map((t) => t.word)).toEqual(["λόγος"]);
  });

  it("brings a missed word back within the session (10 minutes) and counts the miss", async () => {
    const id = await lemmaId("ἀρχή");
    const body = gradeResponseSchema.parse(await (await grade(id, { grade: "again" })).json());
    expect(body.nextReviewAt).toBe(minutes(10).toISOString());

    clock.now = minutes(11);
    expect((await queue()).items[0]).toMatchObject({ lemmaId: id, kind: "due" });
    const [progress] = await db
      .select()
      .from(userWordProgress)
      .where(and(eq(userWordProgress.lemmaId, id)));
    expect(progress).toMatchObject({ correctCount: 0, incorrectCount: 1 });
  });

  it("records the lesson context when given", async () => {
    const id = await lemmaId("θεός");
    await grade(id, { grade: "easy", context: "lesson" });
    const [event] = await db.select().from(reviewEvents).where(eq(reviewEvents.lemmaId, id));
    expect(event?.context).toBe("lesson");
  });

  it.each([
    [{ grade: "perfect" }, 400],
    [{ grade: "good", extra: true }, 400],
    [{}, 400],
  ])("rejects body %j", async (body, status) => {
    expect((await grade(await lemmaId("λόγος"), body)).status).toBe(status);
  });

  it("404s for an unknown word, 400 for a bad id, 401 without a session", async () => {
    expect((await grade(999999, { grade: "good" })).status).toBe(404);
    expect((await grade(0, { grade: "good" })).status).toBe(400);
    const res = await app.request(`/review/${await lemmaId("λόγος")}`, {
      method: "POST",
      body: JSON.stringify({ grade: "good" }),
    });
    expect(res.status).toBe(401);
  });
});
