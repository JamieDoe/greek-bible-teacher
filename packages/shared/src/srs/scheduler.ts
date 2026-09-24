import type { ReviewGrade } from "../learning/enums";

/**
 * Scheduling state for one word, as stored in `user_word_progress`. Column meanings are fixed
 * so another scheduler (e.g. FSRS) can take over the same rows:
 * - `difficulty`: 0 (easiest) … 1 (hardest)
 * - `stability`: days the memory is expected to last; for SM-2 this is the interval
 * - `intervalDays`: days between the last review and the next
 */
export interface SrsState {
  difficulty: number;
  stability: number;
  intervalDays: number;
  nextReviewAt: Date;
  lastReviewedAt: Date;
}

/** The single seam for spaced repetition. Swap the implementation, keep the callers. */
export interface Scheduler {
  readonly name: string;
  /** State after a graded review. `previous` is null for a word never reviewed. */
  review(previous: SrsState | null, grade: ReviewGrade, now: Date): SrsState;
  /**
   * A lookup while reading is a weak signal, not a failed review: it only brings the next
   * review earlier. Returns the new due date (never later than the current one).
   */
  nudgeForLookup(state: SrsState, now: Date): Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const HOUR_MS = 60 * 60 * 1000;

// SM-2 ease factor bounds. Ease is stored as difficulty: ease 3.0 ↔ 0, ease 1.3 ↔ 1.
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const START_EASE = 2.5;
const easeToDifficulty = (ease: number) => (MAX_EASE - ease) / (MAX_EASE - MIN_EASE);
// Ease only ever moves in steps of 0.01 or more, so rounding to 2 dp undoes float error
// (including float4 storage of `difficulty`).
const difficultyToEase = (d: number) => round2(MAX_EASE - d * (MAX_EASE - MIN_EASE));
const clampEase = (e: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, e));

/** Relearning delay after "again": seen again later in the same session or day. */
export const AGAIN_DELAY_MS = 10 * 60 * 1000;
export const MAX_INTERVAL_DAYS = 365;
const GRADUATED_INTERVAL_DAYS = 6;
const HARD_FACTOR = 1.2;
const EASY_BONUS = 1.3;

// SM-2 quality for each grade (again < 3 is a lapse).
const EASE_DELTA: Record<ReviewGrade, number> = {
  again: -0.2,
  hard: -0.14, // q=3: 0.1 - 2 * (0.08 + 2 * 0.02)
  good: 0, // q=4
  easy: 0.1, // q=5
};

/**
 * SM-2 with Anki-style hard/easy modifiers:
 * - again: interval 0, due in 10 minutes, ease −0.2
 * - first success (or after a lapse): hard/good 1 day, easy 4 days
 * - later: good → 6 days, then interval × ease; hard → interval × 1.2; easy → good × 1.3
 * - intervals never shrink on success and are capped at 365 days.
 */
export const sm2Scheduler: Scheduler = {
  name: "sm2",

  review(previous, grade, now) {
    const prevEase = previous ? difficultyToEase(previous.difficulty) : START_EASE;
    const ease = clampEase(prevEase + EASE_DELTA[grade]);
    const prevInterval = previous?.intervalDays ?? 0;

    let interval: number;
    if (grade === "again") {
      interval = 0;
    } else if (prevInterval < 1) {
      interval = grade === "easy" ? 4 : 1;
    } else if (grade === "hard") {
      interval = Math.max(prevInterval + 1, prevInterval * HARD_FACTOR);
    } else {
      const good =
        prevInterval < GRADUATED_INTERVAL_DAYS
          ? GRADUATED_INTERVAL_DAYS
          : Math.max(prevInterval + 1, prevInterval * ease);
      interval = grade === "easy" ? good * EASY_BONUS : good;
    }
    interval = round2(Math.min(MAX_INTERVAL_DAYS, interval));

    const nextReviewAt = new Date(
      now.getTime() + (grade === "again" ? AGAIN_DELAY_MS : interval * DAY_MS),
    );
    return {
      difficulty: easeToDifficulty(ease),
      stability: interval,
      intervalDays: interval,
      nextReviewAt,
      lastReviewedAt: now,
    };
  },

  nudgeForLookup(state, now) {
    const remaining = state.nextReviewAt.getTime() - now.getTime();
    if (remaining <= HOUR_MS) return state.nextReviewAt; // already (nearly) due
    // Halve the time left, but never pull it closer than an hour from now.
    return new Date(now.getTime() + Math.max(HOUR_MS, remaining / 2));
  },
};
