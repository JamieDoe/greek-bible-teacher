/** Inputs for scoring a passage, all derivable from the imported text and the curriculum. */
export interface PassageDifficultyInput {
  /** NT frequency rank (1 = most frequent lemma) of every token in the passage. */
  tokenLemmaRanks: number[];
  verseCount: number;
  /** Grammar concepts the passage needs that come later than the learner's current point. */
  uncoveredConceptCount: number;
}

/** Lemmas ranked above this count as core vocabulary. */
export const CORE_VOCABULARY_RANK = 300;
/** Number of distinct NT lemmas (5,461 at the pinned data); used to scale ranks. */
const RANK_SCALE = 5461;
/** Verses this long (in tokens) or longer count as maximally long. */
const LONG_VERSE_TOKENS = 30;
/** This many uncovered concepts or more count as maximally demanding. */
const MANY_CONCEPTS = 8;

export const DIFFICULTY_WEIGHTS = {
  averageRank: 0.35,
  outsideCore: 0.35,
  verseLength: 0.15,
  uncoveredConcepts: 0.15,
} as const;

export interface PassageDifficulty {
  /** 0 (easiest) … 100 (hardest), one decimal place. */
  score: number;
  /** Each component on a 0–1 scale, for explaining the score. */
  components: Record<keyof typeof DIFFICULTY_WEIGHTS, number>;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * A simple, explainable difficulty score:
 * - average lemma frequency rank (log scale, so rare words weigh more);
 * - the share of tokens outside the core vocabulary (top {@link CORE_VOCABULARY_RANK});
 * - average verse length in tokens;
 * - required grammar concepts the learner hasn't reached yet.
 */
export function passageDifficulty(input: PassageDifficultyInput): PassageDifficulty {
  const ranks = input.tokenLemmaRanks;
  if (ranks.length === 0 || input.verseCount <= 0) {
    throw new Error("A passage needs at least one token and one verse");
  }
  const meanLogRank = ranks.reduce((sum, r) => sum + Math.log(Math.max(1, r)), 0) / ranks.length;
  const components = {
    averageRank: clamp01(meanLogRank / Math.log(RANK_SCALE)),
    outsideCore: ranks.filter((r) => r > CORE_VOCABULARY_RANK).length / ranks.length,
    verseLength: clamp01(ranks.length / input.verseCount / LONG_VERSE_TOKENS),
    uncoveredConcepts: clamp01(input.uncoveredConceptCount / MANY_CONCEPTS),
  };
  const raw = (Object.keys(DIFFICULTY_WEIGHTS) as (keyof typeof DIFFICULTY_WEIGHTS)[]).reduce(
    (sum, k) => sum + DIFFICULTY_WEIGHTS[k] * components[k],
    0,
  );
  return { score: Math.round(raw * 1000) / 10, components };
}
