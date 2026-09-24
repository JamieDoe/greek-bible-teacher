import { describe, expect, it } from "vitest";
import { AGAIN_DELAY_MS, MAX_INTERVAL_DAYS, sm2Scheduler as s, type SrsState } from "./scheduler";

const T0 = new Date("2026-01-01T09:00:00Z");
const days = (n: number) => new Date(T0.getTime() + n * 86_400_000);
const hours = (n: number) => new Date(T0.getTime() + n * 3_600_000);

/** Applies grades one after another, each at the moment the previous review fell due. */
function run(grades: Parameters<typeof s.review>[1][]): SrsState[] {
  const states: SrsState[] = [];
  let prev: SrsState | null = null;
  let now = T0;
  for (const g of grades) {
    prev = s.review(prev, g, now);
    states.push(prev);
    now = prev.nextReviewAt;
  }
  return states;
}

describe("sm2Scheduler.review: first review of a new word", () => {
  it.each([
    ["again", 0, AGAIN_DELAY_MS],
    ["hard", 1, 86_400_000],
    ["good", 1, 86_400_000],
    ["easy", 4, 4 * 86_400_000],
  ] as const)("%s → interval %d", (grade, interval, dueInMs) => {
    const state = s.review(null, grade, T0);
    expect(state.intervalDays).toBe(interval);
    expect(state.nextReviewAt.getTime() - T0.getTime()).toBe(dueInMs);
    expect(state.lastReviewedAt).toEqual(T0);
  });

  it("starts at ease 2.5 (difficulty ≈ 0.29) and moves difficulty with the grade", () => {
    expect(s.review(null, "good", T0).difficulty).toBeCloseTo(0.294, 3);
    expect(s.review(null, "easy", T0).difficulty).toBeLessThan(0.29);
    expect(s.review(null, "hard", T0).difficulty).toBeGreaterThan(0.29);
    expect(s.review(null, "again", T0).difficulty).toBeGreaterThan(0.29);
  });
});

describe("sm2Scheduler.review: sequences", () => {
  it("good, good, good → 1, 6, 15 days (6 × 2.5)", () => {
    expect(run(["good", "good", "good"]).map((x) => x.intervalDays)).toEqual([1, 6, 15]);
  });

  it("dates follow the intervals exactly", () => {
    const [a, b] = run(["good", "good"]);
    expect(a!.nextReviewAt).toEqual(days(1));
    expect(b!.nextReviewAt).toEqual(days(7));
  });

  it("easy grows faster than good, hard slower", () => {
    const easy = run(["good", "easy", "easy"]).at(-1)!.intervalDays;
    const good = run(["good", "good", "good"]).at(-1)!.intervalDays;
    const hard = run(["good", "hard", "hard"]).at(-1)!.intervalDays;
    expect(easy).toBeGreaterThan(good);
    expect(hard).toBeLessThan(good);
  });

  it("hard never shrinks the interval", () => {
    const states = run(["good", "good", "hard", "hard", "hard"]);
    for (let i = 1; i < states.length; i++) {
      expect(states[i]!.intervalDays).toBeGreaterThan(states[i - 1]!.intervalDays);
    }
  });

  it("again after a long interval resets to relearning, then restarts at 1 day", () => {
    const states = run(["good", "good", "good", "again", "good"]);
    expect(states[3]!.intervalDays).toBe(0);
    expect(states[4]!.intervalDays).toBe(1);
  });

  it("repeated lapses bottom out at ease 1.3 (difficulty 1)", () => {
    const last = run(Array(12).fill("again")).at(-1)!;
    expect(last.difficulty).toBeCloseTo(1, 10);
  });

  it("repeated easy tops out at ease 3.0 (difficulty 0) and caps the interval at a year", () => {
    const last = run(Array(12).fill("easy")).at(-1)!;
    expect(last.difficulty).toBeCloseTo(0, 10);
    expect(last.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });

  it("keeps stability equal to the interval (SM-2 has no separate estimate)", () => {
    for (const st of run(["good", "easy", "hard", "again"])) {
      expect(st.stability).toBe(st.intervalDays);
    }
  });

  it("survives float4 storage of difficulty without drifting", () => {
    const first = s.review(null, "good", T0);
    const stored = { ...first, difficulty: Math.fround(first.difficulty) };
    expect(s.review(stored, "good", first.nextReviewAt).intervalDays).toBe(6);
    const second = s.review(stored, "good", first.nextReviewAt);
    const stored2 = { ...second, difficulty: Math.fround(second.difficulty) };
    expect(s.review(stored2, "good", second.nextReviewAt).intervalDays).toBe(15);
  });

  it("is deterministic", () => {
    expect(run(["good", "hard", "easy"])).toEqual(run(["good", "hard", "easy"]));
  });
});

describe("sm2Scheduler.nudgeForLookup", () => {
  const state = (due: Date): SrsState => ({
    difficulty: 0.29,
    stability: 6,
    intervalDays: 6,
    nextReviewAt: due,
    lastReviewedAt: T0,
  });

  it("halves the time remaining", () => {
    expect(s.nudgeForLookup(state(days(10)), T0)).toEqual(days(5));
  });

  it("never pulls the review closer than an hour away", () => {
    expect(s.nudgeForLookup(state(hours(1.5)), T0)).toEqual(hours(1));
  });

  it("leaves a word that is already due (or due within the hour) alone", () => {
    expect(s.nudgeForLookup(state(hours(-2)), T0)).toEqual(hours(-2));
    expect(s.nudgeForLookup(state(hours(0.5)), T0)).toEqual(hours(0.5));
  });

  it("is weaker than a failed review: repeated lookups converge on an hour, not 10 minutes", () => {
    let due = days(30);
    for (let i = 0; i < 20; i++) due = s.nudgeForLookup(state(due), T0);
    expect(due).toEqual(hours(1));
    expect(due.getTime() - T0.getTime()).toBeGreaterThan(AGAIN_DELAY_MS);
  });

  it("does not change interval, difficulty or counts (it only returns a date)", () => {
    const before = state(days(10));
    s.nudgeForLookup(before, T0);
    expect(before).toEqual(state(days(10)));
  });
});
