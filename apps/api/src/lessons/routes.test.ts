import {
  apiErrorSchema,
  lessonProgressSchema,
  lessonResponseSchema,
  reviewQueueResponseSchema,
  sessionResponseSchema,
  todayResponseSchema,
} from "@gbt/shared";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CORPUS_BOOKS, cookieFrom, importBooks, T0, testApp } from "../../test/fixtures";
import { grammarContent } from "../content/grammar";
import { lessonContent } from "../content/lessons";
import { seedGrammar } from "../content/seed-grammar";
import { seedLessons } from "../content/seed-lessons";

const { app, db, clock, close } = testApp();
let cookie = "";
beforeAll(async () => {
  await importBooks(db, CORPUS_BOOKS);
  await seedGrammar(db, grammarContent);
  await seedLessons(db, lessonContent);
}, 120_000);
afterAll(close);
beforeEach(async () => {
  await db.execute(sql`truncate users cascade`);
  clock.now = T0;
  cookie = cookieFrom(await app.request("/session/anonymous", { method: "POST" }));
});

const send = (method: string, path: string, body?: unknown, withCookie = true) =>
  app.request(path, {
    method,
    headers: { ...(withCookie ? { Cookie: cookie } : {}), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const today = async () => todayResponseSchema.parse(await (await send("GET", "/today")).json());
const lesson = async (id: number) =>
  lessonResponseSchema.parse(await (await send("GET", `/lessons/${id}`)).json()).lesson;

describe("POST /me/onboarding", () => {
  it("saves experience and daily minutes and marks the user onboarded", async () => {
    expect((await today()).onboarded).toBe(false);
    const res = await send("POST", "/me/onboarding", { experienceLevel: "none", dailyMinutes: 10 });
    expect(res.status).toBe(200);
    expect(sessionResponseSchema.parse(await res.json()).user).toMatchObject({
      experienceLevel: "none",
      dailyMinutes: 10,
      onboarded: true,
    });
    expect(await today()).toMatchObject({ onboarded: true, dailyMinutes: 10 });
  });

  it.each([
    { experienceLevel: "expert", dailyMinutes: 10 },
    { experienceLevel: "none", dailyMinutes: 7 },
    { experienceLevel: "none" },
    { experienceLevel: "none", dailyMinutes: 10, email: "x@example.com" },
  ])("rejects %j", async (body) => {
    const res = await send("POST", "/me/onboarding", body);
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("validation_error");
  });

  it("requires a session", async () => {
    const res = await send(
      "POST",
      "/me/onboarding",
      { experienceLevel: "none", dailyMinutes: 10 },
      false,
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /today", () => {
  it("offers lesson 1 with its concept and passage to a new learner", async () => {
    expect(await today()).toMatchObject({
      dueCount: 0,
      lesson: {
        number: 1,
        title: "In the beginning was the Word",
        stepCount: 7,
        currentStep: 0,
        started: false,
      },
      lastCompleted: null,
      concept: { slug: "article-and-case" },
      passage: { title: "John 1:1–5" },
      progress: { wordsInReview: 0, passagesCompleted: 0, conceptsStudied: 0, lessonsCompleted: 0 },
    });
  });

  it("moves on to lesson 2 once lesson 1 is completed", async () => {
    const first = (await today()).lesson!;
    await send("POST", `/lessons/${first.id}/progress`, { step: 6, completed: true });
    const t = await today();
    expect(t.lesson?.number).toBe(2);
    expect(t.lastCompleted).toMatchObject({ number: 1, completedAt: T0.toISOString() });
    expect(t.progress.lessonsCompleted).toBe(1);
  });

  it("requires a session", async () => {
    expect((await send("GET", "/today", undefined, false)).status).toBe(401);
  });
});

describe("GET /lessons/:id", () => {
  it("lays out the daily loop for lesson 1", async () => {
    const l = await lesson((await today()).lesson!.id);
    expect(l.steps.map((s) => s.kind)).toEqual([
      "review_due",
      "vocab",
      "grammar",
      "reading",
      "investigate",
      "review_recall",
      "reread",
    ]);
    const vocab = l.steps[1];
    const recall = l.steps[5];
    expect(vocab?.kind === "vocab" && vocab.lemmaIds.length).toBe(5);
    expect(recall?.kind === "review_recall" && vocab?.kind === "vocab" && recall.lemmaIds).toEqual(
      vocab?.kind === "vocab" ? vocab.lemmaIds : null,
    );
  });

  it("marks the forms in the passage that show the lesson's concept, with curated notes", async () => {
    const l = await lesson((await today()).lesson!.id);
    const step = l.steps.find((s) => s.kind === "investigate");
    if (step?.kind !== "investigate") throw new Error("no investigate step");
    const john11 = step.verses.find((v) => v.displayRef === "John 1:1")!;
    expect(john11.tokens.filter((t) => t.isTarget).map((t) => t.word)).toEqual([
      "ὁ",
      "λόγος",
      "ὁ",
      "λόγος",
      "τὸν",
      "θεόν",
      "θεὸς",
      "ὁ",
      "λόγος",
    ]);
    expect(john11.notes.map((n) => n.word)).toEqual(["ὁ", "λόγος", "τὸν", "θεόν", "θεὸς"]);
  });

  it("404s for an unknown lesson and 400s for a bad id", async () => {
    expect((await send("GET", "/lessons/99999")).status).toBe(404);
    expect((await send("GET", "/lessons/x")).status).toBe(400);
  });
});

describe("POST /lessons/:id/progress", () => {
  it("saves the step for resuming, and keeps completion once reached", async () => {
    const id = (await today()).lesson!.id;
    const saved = lessonProgressSchema.parse(
      await (await send("POST", `/lessons/${id}/progress`, { step: 3 })).json(),
    );
    expect(saved).toEqual({ currentStep: 3, completedAt: null });
    expect((await lesson(id)).progress).toEqual({ currentStep: 3, completedAt: null });
    expect((await today()).lesson).toMatchObject({ currentStep: 3, started: true });

    await send("POST", `/lessons/${id}/progress`, { step: 6, completed: true });
    clock.now = new Date(T0.getTime() + 60_000);
    const again = lessonProgressSchema.parse(
      await (await send("POST", `/lessons/${id}/progress`, { step: 0 })).json(),
    );
    expect(again).toEqual({ currentStep: 0, completedAt: T0.toISOString() });
  });

  it("rejects a step beyond the lesson and bad bodies", async () => {
    const id = (await today()).lesson!.id;
    expect((await send("POST", `/lessons/${id}/progress`, { step: 7 })).status).toBe(400);
    expect((await send("POST", `/lessons/${id}/progress`, { step: -1 })).status).toBe(400);
    expect((await send("POST", `/lessons/${id}/progress`, {})).status).toBe(400);
  });
});

describe("GET /review/queue?mode=due", () => {
  it("returns only due words, never new ones", async () => {
    const res = await send("GET", "/review/queue?mode=due");
    expect(reviewQueueResponseSchema.parse(await res.json()).items).toEqual([]);
  });
});
