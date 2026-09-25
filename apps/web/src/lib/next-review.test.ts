import { describe, expect, it } from "vitest";
import { nextReviewIn } from "./next-review";

const now = new Date("2026-03-01T09:00:00Z");
const after = (ms: number) => new Date(now.getTime() + ms);
const MIN = 60_000;
const HOUR = 60 * MIN;

describe("nextReviewIn", () => {
  it("counts minutes, then hours, then days", () => {
    expect(nextReviewIn(after(4.2 * MIN), now)).toBe("in 5 minutes");
    expect(nextReviewIn(after(2.5 * HOUR), now)).toBe("in 3 hours");
    expect(nextReviewIn(after(3 * HOUR + MIN), now)).toBe("in 3 hours");
    expect(nextReviewIn(after(61 * MIN), now)).toBe("in 1 hour");
    expect(nextReviewIn(after(24 * HOUR), now)).toBe("tomorrow");
    expect(nextReviewIn(after(4 * 24 * HOUR + HOUR), now)).toBe("in 4 days");
  });

  it("never says less than a minute, even for a moment that has just passed", () => {
    expect(nextReviewIn(after(10_000), now)).toBe("in 1 minute");
    expect(nextReviewIn(after(-5_000), now)).toBe("in 1 minute");
  });

  it("calls anything from 20 hours on 'tomorrow' rather than a count of hours", () => {
    expect(nextReviewIn(after(21 * HOUR), now)).toBe("tomorrow");
  });
});
