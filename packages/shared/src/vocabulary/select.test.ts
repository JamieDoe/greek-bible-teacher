import { describe, expect, it } from "vitest";
import { selectNewVocabulary, stageMaxRank, type VocabularyCandidate } from "./select";

const c = (lemmaId: number, over: Partial<VocabularyCandidate> = {}): VocabularyCandidate => ({
  lemmaId,
  ntFrequency: 10,
  frequencyRank: 500,
  inCurrentPassage: false,
  scheduled: false,
  hasGloss: true,
  lookupsCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  ...over,
});

const opts = { limit: 10, knownCount: 0 };

describe("selectNewVocabulary", () => {
  it("puts current-passage words first, even rare ones", () => {
    const picked = selectNewVocabulary(
      [
        c(1, { frequencyRank: 1, ntFrequency: 19769 }), // ὁ
        c(2, { inCurrentPassage: true, frequencyRank: 900, ntFrequency: 3 }),
      ],
      opts,
    );
    expect(picked).toEqual([2, 1]);
  });

  it("orders the tiers: passage, high frequency, struggling, stage-appropriate", () => {
    const picked = selectNewVocabulary(
      [
        c(10, { frequencyRank: 150, ntFrequency: 60 }), // stage (rank ≤ 200)
        c(11, { frequencyRank: 1000, ntFrequency: 2, lookupsCount: 3 }), // struggling
        c(12, { frequencyRank: 50, ntFrequency: 300 }), // high frequency
        c(13, { inCurrentPassage: true, ntFrequency: 55, frequencyRank: 160 }),
      ],
      opts,
    );
    expect(picked).toEqual([13, 12, 11, 10]);
  });

  it("ranks by NT frequency within a tier, then by lemma id", () => {
    const picked = selectNewVocabulary(
      [
        c(3, { inCurrentPassage: true, ntFrequency: 55 }),
        c(1, { inCurrentPassage: true, ntFrequency: 330 }),
        c(4, { inCurrentPassage: true, ntFrequency: 55 }),
        c(2, { inCurrentPassage: true, ntFrequency: 2456 }),
      ],
      opts,
    );
    expect(picked).toEqual([2, 1, 3, 4]);
  });

  it("treats misses as struggling only when they match or outnumber successes", () => {
    const picked = selectNewVocabulary(
      [
        c(1, { frequencyRank: 1000, incorrectCount: 2, correctCount: 2 }),
        c(2, { frequencyRank: 1000, incorrectCount: 1, correctCount: 3 }),
        c(3, { frequencyRank: 1000, lookupsCount: 1 }),
      ],
      opts,
    );
    expect(picked).toEqual([1]);
  });

  it("skips scheduled words, glossless words and words beyond the learner's stage", () => {
    const picked = selectNewVocabulary(
      [
        c(1, { inCurrentPassage: true, scheduled: true }),
        c(2, { inCurrentPassage: true, hasGloss: false }),
        c(3, { frequencyRank: stageMaxRank(0) + 1 }),
        c(4, { frequencyRank: stageMaxRank(0) }),
      ],
      opts,
    );
    expect(picked).toEqual([4]);
  });

  it("widens the stage band as the learner knows more words", () => {
    const rare = [c(1, { frequencyRank: 450 })];
    expect(selectNewVocabulary(rare, { limit: 5, knownCount: 0 })).toEqual([]);
    expect(selectNewVocabulary(rare, { limit: 5, knownCount: 200 })).toEqual([1]);
  });

  it("respects the limit and ignores duplicate candidates", () => {
    const many = [1, 2, 3, 3, 4].map((id) => c(id, { inCurrentPassage: true }));
    expect(selectNewVocabulary(many, { limit: 3, knownCount: 0 })).toEqual([1, 2, 3]);
    expect(selectNewVocabulary(many, { limit: 0, knownCount: 0 })).toEqual([]);
  });

  it("selects John 1:1–5 slice words first (fixture from real frequencies)", () => {
    const john = [
      { id: 9, lemma: "ὁ", f: 19769, rank: 1 },
      { id: 32, lemma: "καί", f: 8973, rank: 2 },
      { id: 73, lemma: "εἰμί", f: 2456, rank: 8 },
      { id: 30, lemma: "θεός", f: 1307, rank: 16 },
      { id: 506, lemma: "λόγος", f: 330, rank: 90 },
      { id: 1270, lemma: "ἀρχή", f: 55, rank: 470 },
    ].map((w) => c(w.id, { inCurrentPassage: true, ntFrequency: w.f, frequencyRank: w.rank }));
    const elsewhere = c(2000, { frequencyRank: 3, ntFrequency: 5546 }); // αὐτός, not in 1:1
    expect(selectNewVocabulary([elsewhere, ...john], { limit: 5, knownCount: 0 })).toEqual([
      9, 32, 73, 30, 506,
    ]);
  });
});
