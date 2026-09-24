import { describe, expect, it } from "vitest";
import { niceTicks } from "./chart";

describe("niceTicks", () => {
  it.each([
    [0, [0, 1]],
    [1, [0, 1]],
    [3, [0, 1, 2, 3]],
    [7, [0, 5, 10]],
    [61, [0, 50, 100]],
    [122, [0, 50, 100, 150]],
    [1840, [0, 1000, 2000]],
  ])("max %d → %j", (max, ticks) => {
    expect(niceTicks(max)).toEqual(ticks);
  });

  it("never uses fractional steps for counts", () => {
    for (const max of [1, 2, 3]) expect(niceTicks(max).every(Number.isInteger)).toBe(true);
  });

  it("always reaches the maximum with round steps", () => {
    for (const max of [2, 9, 13, 48, 99, 250, 999, 4321]) {
      const t = niceTicks(max);
      expect(t[0]).toBe(0);
      expect(t.at(-1)).toBeGreaterThanOrEqual(max);
      expect(t.length).toBeLessThanOrEqual(5);
    }
  });
});
