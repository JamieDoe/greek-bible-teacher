import { describe, expect, it } from "vitest";
import { parseBlocks, parseInline, splitGoingDeeper } from "./markdown";

describe("parseBlocks", () => {
  it("reads headings, paragraphs and lists", () => {
    expect(
      parseBlocks(`
Greek shows **who is what**
by form.

## Why it matters

- ὁ λόγος: the subject
- τὸν θεόν: the object
`),
    ).toEqual([
      { type: "paragraph", text: "Greek shows **who is what** by form." },
      { type: "heading", level: 2, text: "Why it matters" },
      { type: "list", items: ["ὁ λόγος: the subject", "τὸν θεόν: the object"] },
    ]);
  });

  it("treats raw HTML as plain paragraph text", () => {
    expect(parseBlocks("<script>alert(1)</script>")).toEqual([
      { type: "paragraph", text: "<script>alert(1)</script>" },
    ]);
  });
});

describe("parseInline", () => {
  it("marks bold and italic", () => {
    expect(parseInline("a **b** c *d*")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " c " },
      { text: "d", italic: true },
    ]);
  });

  it("marks runs of Greek (with accents, breathings and elision), keeping English apart", () => {
    expect(parseInline("In πρὸς τὸν θεόν, πρός takes δι’ αὐτοῦ.")).toEqual([
      { text: "In " },
      { text: "πρὸς τὸν θεόν", greek: true },
      { text: ", " },
      { text: "πρός", greek: true },
      { text: " takes " },
      { text: "δι’ αὐτοῦ", greek: true },
      { text: "." },
    ]);
  });

  it("marks Greek inside bold", () => {
    expect(parseInline("**ὁ λόγος** is")).toEqual([
      { text: "ὁ λόγος", bold: true, greek: true },
      { text: " is" },
    ]);
  });

  it("handles decomposed (NFD) Greek", () => {
    const nfd = "ἀρχῇ".normalize("NFD");
    expect(parseInline(`x ${nfd}`)).toEqual([{ text: "x " }, { text: nfd, greek: true }]);
  });
});

describe("splitGoingDeeper", () => {
  it("separates the terminology section", () => {
    expect(splitGoingDeeper("Simple.\n\n## Going deeper\n\nTerms.")).toEqual({
      main: "Simple.",
      deeper: "Terms.",
    });
  });
  it("returns null when there is none", () => {
    expect(splitGoingDeeper("Simple.")).toEqual({ main: "Simple.", deeper: null });
  });
});
