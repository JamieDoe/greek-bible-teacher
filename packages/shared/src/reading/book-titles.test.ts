import { describe, expect, it } from "vitest";
import { GREEK_BOOK_TITLES, greekBookTitle } from "./book-titles";

describe("greekBookTitle", () => {
  it("covers all 27 books", () => {
    expect(Object.keys(GREEK_BOOK_TITLES)).toHaveLength(27);
  });
  it("reads the book code from a verse ref", () => {
    expect(greekBookTitle("JHN 1:1")).toBe("ΚΑΤΑ ΙΩΑΝΝΗΝ");
    expect(greekBookTitle("1JN 4:7")).toBe("ΙΩΑΝΝΟΥ Α");
    expect(greekBookTitle("XYZ 1:1")).toBeNull();
  });
});
