/** A lemma the learner might start learning, with what we know about it and about them. */
export interface VocabularyCandidate {
  lemmaId: number;
  ntFrequency: number;
  /** 1 = most frequent lemma in the NT. */
  frequencyRank: number;
  /** Occurs in the passage the learner is currently working towards. */
  inCurrentPassage: boolean;
  /** Already has a review schedule (it is being learned); such words are never "new". */
  scheduled: boolean;
  hasGloss: boolean;
  lookupsCount: number;
  correctCount: number;
  incorrectCount: number;
}

export interface SelectionOptions {
  limit: number;
  /** Words the learner has already learned; widens the stage-appropriate frequency band. */
  knownCount: number;
}

/** Lemmas in the NT's top N by frequency count as "high frequency" (tier 2). */
export const HIGH_FREQUENCY_RANK = 100;

/** Upper frequency rank that is stage-appropriate for a learner who knows `knownCount` words. */
export const stageMaxRank = (knownCount: number) => Math.max(200, 100 + knownCount * 2);

/** Looked up at least twice, or missed at least as often as recalled. */
export const isStruggling = (c: VocabularyCandidate) =>
  c.lookupsCount >= 2 || (c.incorrectCount > 0 && c.incorrectCount >= c.correctCount);

/**
 * Chooses which new words to introduce, never at random. Priority tiers, in order:
 * 1. words in the current passage;
 * 2. high NT-frequency words (top {@link HIGH_FREQUENCY_RANK});
 * 3. words the learner struggles with (repeated lookups, misses);
 * 4. other stage-appropriate words (frequency rank within {@link stageMaxRank}).
 * Within a tier, more frequent words come first, then lower lemma id. Words already scheduled
 * or without a gloss (they can't be quizzed) are skipped; anything outside the tiers is too.
 */
export function selectNewVocabulary(
  candidates: VocabularyCandidate[],
  { limit, knownCount }: SelectionOptions,
): number[] {
  const maxRank = stageMaxRank(knownCount);
  const tier = (c: VocabularyCandidate): number | null => {
    if (c.inCurrentPassage) return 1;
    if (c.frequencyRank <= HIGH_FREQUENCY_RANK) return 2;
    if (isStruggling(c)) return 3;
    if (c.frequencyRank <= maxRank) return 4;
    return null;
  };

  const seen = new Set<number>();
  return candidates
    .filter((c) => !c.scheduled && c.hasGloss)
    .flatMap((c) => {
      const t = tier(c);
      if (t === null || seen.has(c.lemmaId)) return [];
      seen.add(c.lemmaId);
      return [{ c, t }];
    })
    .sort((a, b) => a.t - b.t || b.c.ntFrequency - a.c.ntFrequency || a.c.lemmaId - b.c.lemmaId)
    .slice(0, Math.max(0, limit))
    .map(({ c }) => c.lemmaId);
}
