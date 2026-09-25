import { describe, expect, it } from "vitest";
import { CORE_VOCABULARY_RANK, passageDifficulty } from "./difficulty";

const base = { verseCount: 1, uncoveredConceptCount: 0 };

describe("passageDifficulty", () => {
  it("scores a passage of only the most frequent word near zero", () => {
    const { score, components } = passageDifficulty({ ...base, tokenLemmaRanks: [1, 1, 1, 1] });
    expect(components).toEqual({
      averageRank: 0,
      outsideCore: 0,
      verseLength: 4 / 30,
      uncoveredConcepts: 0,
    });
    expect(score).toBe(2);
  });

  it("rises with rarer vocabulary", () => {
    const common = passageDifficulty({ ...base, tokenLemmaRanks: [1, 5, 20, 50] }).score;
    const rare = passageDifficulty({ ...base, tokenLemmaRanks: [1, 500, 2000, 5000] }).score;
    expect(rare).toBeGreaterThan(common);
  });

  it("counts the share of tokens outside the core vocabulary", () => {
    const { components } = passageDifficulty({
      ...base,
      tokenLemmaRanks: [1, CORE_VOCABULARY_RANK, CORE_VOCABULARY_RANK + 1, 4000],
    });
    expect(components.outsideCore).toBe(0.5);
  });

  it("rises with longer verses, capped at 30 tokens per verse", () => {
    const ranks = Array(30).fill(10);
    const short = passageDifficulty({ ...base, verseCount: 3, tokenLemmaRanks: ranks });
    const long = passageDifficulty({ ...base, verseCount: 1, tokenLemmaRanks: ranks });
    expect(short.components.verseLength).toBeCloseTo(1 / 3);
    expect(long.components.verseLength).toBe(1);
    expect(long.score).toBeGreaterThan(short.score);
  });

  it("rises with grammar the learner hasn't reached, capped at 8 concepts", () => {
    const ranks = [1, 2, 3];
    const none = passageDifficulty({ ...base, tokenLemmaRanks: ranks });
    const some = passageDifficulty({ ...base, tokenLemmaRanks: ranks, uncoveredConceptCount: 4 });
    const lots = passageDifficulty({ ...base, tokenLemmaRanks: ranks, uncoveredConceptCount: 40 });
    expect(some.score).toBeGreaterThan(none.score);
    expect(lots.components.uncoveredConcepts).toBe(1);
  });

  it("stays within 0–100 and is deterministic", () => {
    const hardest = passageDifficulty({
      tokenLemmaRanks: Array(60).fill(5461),
      verseCount: 1,
      uncoveredConceptCount: 99,
    });
    expect(hardest.score).toBe(100);
    const input = { ...base, tokenLemmaRanks: [3, 90, 700] };
    expect(passageDifficulty(input)).toEqual(passageDifficulty(input));
  });

  it("rejects an empty passage", () => {
    expect(() => passageDifficulty({ ...base, tokenLemmaRanks: [] })).toThrow();
  });
});
