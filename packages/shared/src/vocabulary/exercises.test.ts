import { describe, expect, it } from "vitest";
import { buildChoices, chooseExerciseType, pickDistractors, seededRng } from "./exercises";

describe("chooseExerciseType", () => {
  it("asks new words on their own, then alternates with context", () => {
    const types = [0, 1, 2, 3].map((n) =>
      chooseExerciseType({ correctCount: n, hasContext: true }),
    );
    expect(types).toEqual(["gloss", "context", "gloss", "context"]);
  });
  it("never asks for context when none is available", () => {
    expect(chooseExerciseType({ correctCount: 1, hasContext: false })).toBe("gloss");
  });
});

describe("pickDistractors", () => {
  const target = { lemmaId: 1, gloss: "a word", ntFrequency: 330 };
  const candidates = [
    { lemmaId: 1, gloss: "a word", ntFrequency: 330 }, // the target itself
    { lemmaId: 2, gloss: "A word", ntFrequency: 320 }, // same gloss, different case
    { lemmaId: 3, gloss: "a house", ntFrequency: 300 },
    { lemmaId: 4, gloss: "a house", ntFrequency: 290 }, // duplicate gloss
    { lemmaId: 5, gloss: "a king", ntFrequency: 115 },
    { lemmaId: 6, gloss: "a road", ntFrequency: 101 },
    { lemmaId: 7, gloss: "a lamp", ntFrequency: 14 },
    { lemmaId: 8, gloss: "the article", ntFrequency: 19769 },
  ];

  it("never offers the answer's own gloss or a duplicate gloss", () => {
    for (let seed = 0; seed < 50; seed++) {
      const picked = pickDistractors(target, candidates, { rng: seededRng(seed) });
      const glosses = picked.map((p) => p.gloss.toLowerCase());
      expect(glosses).not.toContain("a word");
      expect(new Set(glosses).size).toBe(glosses.length);
      expect(picked.map((p) => p.lemmaId)).not.toContain(1);
    }
  });

  it("draws from the candidates nearest in frequency", () => {
    const picked = pickDistractors(target, candidates, { count: 2, pool: 2, rng: seededRng(1) });
    expect(picked.map((p) => p.lemmaId).sort()).toEqual([3, 5]);
  });

  it("is reproducible with the same seed", () => {
    const a = pickDistractors(target, candidates, { rng: seededRng(42) });
    const b = pickDistractors(target, candidates, { rng: seededRng(42) });
    expect(a).toEqual(b);
  });

  it("skips excluded glosses (e.g. ones already picked in a first pass)", () => {
    const picked = pickDistractors(target, candidates, {
      rng: seededRng(3),
      exclude: ["A HOUSE", "a king"],
    });
    expect(picked.map((p) => p.gloss)).not.toContain("a house");
    expect(picked.map((p) => p.gloss)).not.toContain("a king");
  });

  it("returns fewer when there are not enough distinct candidates", () => {
    expect(pickDistractors(target, candidates.slice(0, 3), { rng: seededRng(1) })).toHaveLength(1);
  });
});

describe("buildChoices", () => {
  it("includes the answer exactly once and reports its index", () => {
    for (let seed = 0; seed < 20; seed++) {
      const { options, answerIndex } = buildChoices(
        "word",
        ["house", "king", "road"],
        seededRng(seed),
      );
      expect(options).toHaveLength(4);
      expect(options[answerIndex]).toBe("word");
      expect(options.filter((o) => o === "word")).toHaveLength(1);
    }
  });
});
