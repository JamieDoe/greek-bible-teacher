import { describe, expect, it } from "vitest";
import { stageStatuses } from "./stages";

const LOOP = [
  "review_due",
  "vocab",
  "grammar",
  "reading",
  "investigate",
  "review_recall",
  "reread",
] as const;

describe("stageStatuses", () => {
  it("starts with Review current and the rest upcoming", () => {
    expect(stageStatuses([...LOOP], 0).map((s) => [s.key, s.state])).toEqual([
      ["review", "current"],
      ["new", "upcoming"],
      ["grammar", "upcoming"],
      ["read", "upcoming"],
    ]);
  });

  it("groups read, look closer, recall and re-read into the Read stage", () => {
    const read = stageStatuses([...LOOP], 5).find((s) => s.key === "read")!;
    expect(read).toMatchObject({ state: "current", progress: 0.5 });
  });

  it("marks earlier stages done", () => {
    expect(stageStatuses([...LOOP], 2).map((s) => s.state)).toEqual([
      "done",
      "done",
      "current",
      "upcoming",
    ]);
  });

  it("marks everything done when the lesson is completed", () => {
    expect(
      stageStatuses([...LOOP], 6, true).every((s) => s.state === "done" && s.progress === 1),
    ).toBe(true);
  });
});
