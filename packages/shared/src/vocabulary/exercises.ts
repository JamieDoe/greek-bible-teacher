export type ExerciseType = "gloss" | "context";

/**
 * Recognition-first: a word is first asked on its own (Greek → gloss); once recalled at least
 * once, it alternates with the form in its verse context, when a context is available.
 */
export function chooseExerciseType(opts: {
  correctCount: number;
  hasContext: boolean;
}): ExerciseType {
  if (!opts.hasContext || opts.correctCount === 0) return "gloss";
  return opts.correctCount % 2 === 1 ? "context" : "gloss";
}

export interface DistractorCandidate {
  lemmaId: number;
  gloss: string;
  ntFrequency: number;
}

/** Deterministic tests pass a seeded generator; production passes Math.random. */
export type Rng = () => number;

/** Small seeded PRNG (mulberry32) for reproducible shuffles in tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const normaliseGloss = (g: string) => g.trim().toLowerCase();

/**
 * Words that say nothing about a gloss's meaning on their own, including the "I" (and "am")
 * that starts Dodson's verb glosses ("I say", "I am able").
 */
const GLOSS_FILLER = new Set(["a", "an", "the", "of", "be", "one", "s", "i", "am"]);

/**
 * The meaning words of a gloss: "to see, watch" → see, watch. Parenthesised notes go, as does
 * the "to" that marks a verb sense (a sense that is just "to", a preposition, keeps it).
 */
export function glossMeaningWords(gloss: string): Set<string> {
  const words = gloss
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(/[,;]/)
    .flatMap((sense) =>
      sense
        .trim()
        .replace(/^to\s+(?=\S)/, "")
        .split(/[^\p{L}]+/u),
    )
    .filter((w) => w !== "" && !GLOSS_FILLER.has(w));
  return new Set(words);
}

/** Whether two glosses share a meaning word ("to see, watch" and "to see, perceive" do). */
export function glossesOverlap(a: string, b: string): boolean {
  const words = glossMeaningWords(a);
  return [...glossMeaningWords(b)].some((w) => words.has(w));
}

/**
 * Picks `count` distractor glosses for a multiple-choice question. Candidates should already
 * share the target's part of speech; this prefers those closest in NT frequency (log scale),
 * skips glosses identical to the answer, to each other or to `exclude`, and skips near-synonyms
 * of the answer (a shared meaning word), so there is only ever one right answer. It varies the
 * pick with `rng` from the nearest `pool` candidates.
 */
export function pickDistractors(
  target: { lemmaId: number; gloss: string; ntFrequency: number },
  candidates: DistractorCandidate[],
  {
    count = 3,
    pool = 12,
    rng,
    exclude = [],
  }: { count?: number; pool?: number; rng: Rng; exclude?: string[] },
): DistractorCandidate[] {
  const answer = normaliseGloss(target.gloss);
  const logF = Math.log(Math.max(1, target.ntFrequency));
  const glosses = new Set<string>([answer, ...exclude.map(normaliseGloss)]);
  const nearest = candidates
    .filter((c) => c.lemmaId !== target.lemmaId)
    .sort(
      (a, b) =>
        Math.abs(Math.log(Math.max(1, a.ntFrequency)) - logF) -
          Math.abs(Math.log(Math.max(1, b.ntFrequency)) - logF) || a.lemmaId - b.lemmaId,
    )
    .filter((c) => {
      const g = normaliseGloss(c.gloss);
      if (glosses.has(g) || glossesOverlap(c.gloss, target.gloss)) return false;
      glosses.add(g);
      return true;
    })
    .slice(0, pool);
  return shuffle(nearest, rng).slice(0, count);
}

/** The answer plus distractors in shuffled order, with the answer's index. */
export function buildChoices(answer: string, distractors: string[], rng: Rng) {
  const options = shuffle([answer, ...distractors], rng);
  return { options, answerIndex: options.indexOf(answer) };
}
