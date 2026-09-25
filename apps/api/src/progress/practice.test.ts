import { describe, expect, it } from "vitest";
import { localDate, weekOf } from "./practice";

describe("weekOf", () => {
  it("returns Monday to Sunday around a date", () => {
    expect(weekOf("2026-09-24")).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
  });
  it("treats Sunday as the end of the week", () => {
    expect(weekOf("2026-09-27")[0]).toBe("2026-09-21");
    expect(weekOf("2026-09-28")[0]).toBe("2026-09-28");
  });
});

describe("localDate", () => {
  it("uses the learner's time zone", () => {
    const t = new Date("2026-03-01T23:30:00Z");
    expect(localDate(t, "UTC")).toBe("2026-03-01");
    expect(localDate(t, "Pacific/Auckland")).toBe("2026-03-02");
  });
});
