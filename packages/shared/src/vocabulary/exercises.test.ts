import { describe, expect, it } from "vitest";
import {
  buildChoices,
  chooseExerciseType,
  glossesOverlap,
  glossMeaningWords,
  pickDistractors,
  seededRng,
} from "./exercises";

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

  it("never offers a near-synonym of the answer, so only one option is right", () => {
    const see = { lemmaId: 10, gloss: "to see, watch", ntFrequency: 58 };
    const verbs = [
      { lemmaId: 11, gloss: "to see, perceive", ntFrequency: 60 },
      { lemmaId: 12, gloss: "to see, behold", ntFrequency: 22 },
      { lemmaId: 13, gloss: "to love", ntFrequency: 143 },
      { lemmaId: 14, gloss: "to write", ntFrequency: 190 },
      { lemmaId: 15, gloss: "to teach", ntFrequency: 96 },
    ];
    for (let seed = 0; seed < 20; seed++) {
      const picked = pickDistractors(see, verbs, { rng: seededRng(seed) });
      expect(picked.map((p) => p.lemmaId).sort()).toEqual([13, 14, 15]);
    }
  });

  it("returns fewer when there are not enough distinct candidates", () => {
    expect(pickDistractors(target, candidates.slice(0, 3), { rng: seededRng(1) })).toHaveLength(1);
  });
});

describe("glossMeaningWords", () => {
  it("keeps the meaning words, dropping a verb's 'to', notes in brackets and articles", () => {
    expect([...glossMeaningWords("to see, watch")]).toEqual(["see", "watch"]);
    expect([...glossMeaningWords("to beget; (passive) be born")]).toEqual(["beget", "born"]);
    expect([...glossMeaningWords("to send (out)")]).toEqual(["send"]);
    expect([...glossMeaningWords("a house")]).toEqual(["house"]);
    // A preposition's "to" is its meaning.
    expect([...glossMeaningWords("into, to, for")]).toEqual(["into", "to", "for"]);
  });

  it("finds overlaps between near-synonyms only", () => {
    expect(glossesOverlap("to know", "to know, come to know")).toBe(true);
    expect(glossesOverlap("to speak, talk", "to say, speak, tell")).toBe(true);
    expect(glossesOverlap("man, husband", "person, human, man")).toBe(true);
    expect(glossesOverlap("to be, exist", "to be able, can")).toBe(false);
    expect(glossesOverlap("to love", "love")).toBe(true);
    expect(glossesOverlap("to love", "to write")).toBe(false);
    // Dodson's first-person verbs ("I say", "I am able") share only their "I".
    expect(glossesOverlap("I say, speak", "I am powerful, am able")).toBe(false);
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
