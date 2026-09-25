import { describe, expect, it } from "vitest";
import { senseLines } from "./sense-lines";

const verse = (number: number, text: string) => ({
  number,
  tokens: text.split(" ").map((surface) => {
    const m = /^(.*?)([,.;:··;]*)$/u.exec(surface)!;
    return { word: m[1]!, after: m[2]! };
  }),
});
const text = (lines: ReturnType<typeof senseLines<ReturnType<typeof verse>>>) =>
  lines.map(
    (l) => `${l.first ? l.verse.number : "-"} ${l.tokens.map((t) => t.word + t.after).join(" ")}`,
  );

describe("senseLines", () => {
  it("breaks John 1:1–3 at its clause punctuation, as the design does", () => {
    const lines = senseLines([
      verse(1, "Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος."),
      verse(2, "οὗτος ἦν ἐν ἀρχῇ πρὸς τὸν θεόν."),
      verse(3, "πάντα δι’ αὐτοῦ ἐγένετο, καὶ χωρὶς αὐτοῦ ἐγένετο οὐδὲ ἕν. ὃ γέγονεν"),
    ]);
    expect(text(lines)).toEqual([
      "1 Ἐν ἀρχῇ ἦν ὁ λόγος,",
      "- καὶ ὁ λόγος ἦν πρὸς τὸν θεόν,",
      "- καὶ θεὸς ἦν ὁ λόγος.",
      "2 οὗτος ἦν ἐν ἀρχῇ πρὸς τὸν θεόν.",
      "3 πάντα δι’ αὐτοῦ ἐγένετο,",
      "- καὶ χωρὶς αὐτοῦ ἐγένετο οὐδὲ ἕν.",
      "- ὃ γέγονεν", // a verse's unpunctuated end is still a line
    ]);
  });

  it("breaks at the Greek raised dot and question mark", () => {
    const lines = senseLines([verse(4, "ἐν αὐτῷ ζωὴ ἦν· τίς ἐστιν; ὁ λόγος")]);
    expect(text(lines)).toEqual(["4 ἐν αὐτῷ ζωὴ ἦν·", "- τίς ἐστιν;", "- ὁ λόγος"]);
  });
});
