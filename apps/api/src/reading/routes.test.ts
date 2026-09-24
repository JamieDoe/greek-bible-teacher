import {
  apiErrorSchema,
  passageResponseSchema,
  passagesResponseSchema,
  sourcesResponseSchema,
  tokenDetailResponseSchema,
} from "@gbt/shared";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { importJohn, testApp } from "../../test/fixtures";
import { grammarConceptRules, grammarConcepts } from "../db/schema";

const { app, db, close } = testApp();
beforeAll(() => importJohn(db), 60_000);
afterAll(close);

async function john11() {
  const { passages } = passagesResponseSchema.parse(await (await app.request("/passages")).json());
  const res = await app.request(`/passages/${passages[0]!.id}`);
  return passageResponseSchema.parse(await res.json()).passage;
}

describe("GET /passages", () => {
  it("lists the seeded slice passage", async () => {
    const res = await app.request("/passages");
    expect(res.status).toBe(200);
    expect(passagesResponseSchema.parse(await res.json()).passages).toEqual([
      { id: expect.any(Number), title: "John 1:1–5", startRef: "JHN 1:1", endRef: "JHN 1:5" },
    ]);
  });
});

describe("GET /passages/:id", () => {
  it("returns John 1:1–5 with tokens, lemmas and morphology inline", async () => {
    const passage = await john11();
    expect(passage.verses.map((v) => v.ref)).toEqual([
      "JHN 1:1",
      "JHN 1:2",
      "JHN 1:3",
      "JHN 1:4",
      "JHN 1:5",
    ]);
    const [first] = passage.verses;
    expect(first!.tokens).toHaveLength(17);
    expect(first!.tokens[4]).toMatchObject({
      before: "",
      word: "λόγος",
      after: ",",
      lemma: { lemma: "λόγος", gloss: expect.stringContaining("word") },
      morphology: { labels: ["Noun", "Nominative", "Singular", "Masculine"] },
    });
  });

  it("rejects a non-numeric id", async () => {
    const res = await app.request("/passages/abc");
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("validation_error");
  });

  it("404s for an unknown passage", async () => {
    const res = await app.request("/passages/999999");
    expect(res.status).toBe(404);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("not_found");
  });
});

describe("GET /tokens/:id", () => {
  it("returns lemma, gloss, morphology and nearby occurrences for ἀρχῇ (John 1:1)", async () => {
    const tokenId = (await john11()).verses[0]!.tokens[1]!.id;
    const res = await app.request(`/tokens/${tokenId}`);
    expect(res.status).toBe(200);
    const detail = tokenDetailResponseSchema.parse(await res.json());
    expect(detail.token).toMatchObject({
      ref: "JHN 1:1",
      displayRef: "John 1:1",
      position: 2,
      surface: "ἀρχῇ",
    });
    expect(detail.lemma).toMatchObject({
      lemma: "ἀρχή",
      gloss: "ruler, beginning",
      partOfSpeech: "noun",
      glossSource: "Dodson Greek-English Lexicon",
    });
    expect(detail.morphology).toMatchObject({
      posCode: "N-",
      parseCode: "----DSF-",
      case: "dative",
    });
    // Nearest first: John 1:2 repeats ἐν ἀρχῇ.
    expect(detail.occurrences.nearby[0]).toMatchObject({ ref: "JHN 1:2", word: "ἀρχῇ" });
    expect(detail.occurrences.nearby.every((o) => o.tokenId !== tokenId)).toBe(true);
    expect(detail.concepts).toEqual([]);
  });

  it("includes curated notes only from rules that match the token's morphology", async () => {
    const [concept] = await db
      .insert(grammarConcepts)
      .values({
        slug: "dative",
        curriculumOrder: 7,
        title: "Dative",
        summarySimple: "s",
        body: "b",
      })
      .returning();
    await db.insert(grammarConceptRules).values([
      { conceptId: concept!.id, match: { case: "dative" }, note: "Dative after ἐν: 'in'." },
      { conceptId: concept!.id, match: { case: "dative", number: "plural" }, note: "plural" },
    ]);
    try {
      const [first] = (await john11()).verses;
      const dative = tokenDetailResponseSchema.parse(
        await (await app.request(`/tokens/${first!.tokens[1]!.id}`)).json(),
      );
      expect(dative.concepts).toEqual([
        { slug: "dative", title: "Dative", note: "Dative after ἐν: 'in'." },
      ]);
      const nominative = tokenDetailResponseSchema.parse(
        await (await app.request(`/tokens/${first!.tokens[4]!.id}`)).json(),
      );
      expect(nominative.concepts).toEqual([]);
    } finally {
      await db.execute(sql`truncate grammar_concepts restart identity cascade`);
    }
  });

  it("404s for an unknown token and rejects a negative id", async () => {
    expect((await app.request("/tokens/999999999")).status).toBe(404);
    expect((await app.request("/tokens/-3")).status).toBe(400);
  });
});

describe("GET /sources", () => {
  it("lists every source with its licence", async () => {
    const res = await app.request("/sources");
    const { sources } = sourcesResponseSchema.parse(await res.json());
    expect(sources.map((s) => s.licence)).toEqual([
      "CC BY 4.0",
      "CC BY-SA 3.0",
      "Public domain (CC0 1.0)",
    ]);
  });
});
