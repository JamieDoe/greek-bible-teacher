import { describe, expect, it } from "vitest";
import { heatmapWeeks } from "./heatmap";

describe("heatmapWeeks", () => {
  it("starts a new column each Monday", () => {
    const weeks = heatmapWeeks([
      { date: "2026-09-19", count: 0 }, // Saturday
      { date: "2026-09-20", count: 0 }, // Sunday
      { date: "2026-09-21", count: 1 }, // Monday
      { date: "2026-09-22", count: 0 },
    ]);
    expect(weeks.map((w) => w.map((d) => d.date))).toEqual([
      ["2026-09-19", "2026-09-20"],
      ["2026-09-21", "2026-09-22"],
    ]);
  });

  it("scales levels to the busiest day, keeping 0 for no activity", () => {
    const weeks = heatmapWeeks([
      { date: "2026-09-21", count: 0 },
      { date: "2026-09-22", count: 10 },
      { date: "2026-09-23", count: 40 },
      { date: "2026-09-24", count: 100 },
    ]);
    expect(weeks[0]!.map((d) => d.level)).toEqual([0, 1, 2, 3]);
  });

  it("handles an empty or idle range", () => {
    expect(heatmapWeeks([])).toEqual([]);
    expect(heatmapWeeks([{ date: "2026-09-21", count: 0 }])[0]![0]!.level).toBe(0);
  });
});
