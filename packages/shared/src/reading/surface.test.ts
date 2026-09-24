import { describe, expect, it } from "vitest";
import { splitSurface } from "./surface";

describe("splitSurface", () => {
  it.each([
    ["λόγος,", "λόγος", "", ","],
    ["λόγος", "λόγος", "", ""],
    ["ἀνθρώπων·", "ἀνθρώπων", "", "·"],
    ["(ὅ", "ὅ", "(", ""],
    ["⸀αὐτοῦ", "αὐτοῦ", "", ""],
    ["⸂τοῦ", "τοῦ", "", ""],
    ["θεοῦ⸃.", "θεοῦ", "", "."],
    ["⸀1ἐν", "ἐν", "", ""],
    ["(⸀καὶ", "καὶ", "(", ""],
    ["ἐστιν·)", "ἐστιν", "", "·)"],
    ["⸂[καὶ", "καὶ", "[", ""],
  ])("%s → before %j, after %j", (surface, word, before, after) => {
    expect(splitSurface(surface, word)).toEqual({ before, after });
  });

  it("keeps elision marks that are part of the word", () => {
    expect(splitSurface("δι’", "δι’")).toEqual({ before: "", after: "" });
  });

  it("returns no punctuation if the word is not in the surface", () => {
    expect(splitSurface("abc", "xyz")).toEqual({ before: "", after: "" });
  });
});
