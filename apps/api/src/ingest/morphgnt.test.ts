import { describe, expect, it } from "vitest";
import { IngestError } from "./errors";
import { parseMorphgntFile, parseMorphgntLine } from "./morphgnt";

describe("parseMorphgntLine", () => {
  it("splits the seven README columns", () => {
    expect(parseMorphgntLine("040101 N- ----NSM- λόγος, λόγος λόγος λόγος", "t:1")).toEqual({
      book: 4,
      chapter: 1,
      verse: 1,
      posCode: "N-",
      parseCode: "----NSM-",
      surface: "λόγος,",
      word: "λόγος",
      normalized: "λόγος",
      lemma: "λόγος",
    });
  });

  it("keeps surface (with punctuation), word and normalised form distinct", () => {
    const t = parseMorphgntLine("040101 C- -------- καὶ καὶ καί καί", "t:1");
    expect([t.surface, t.word, t.normalized, t.lemma]).toEqual(["καὶ", "καὶ", "καί", "καί"]);
  });

  it("NFC-normalises decomposed input", () => {
    const decomposed = "ἀρχῇ".normalize("NFD");
    const t = parseMorphgntLine(
      `040101 N- ----DSF- ${decomposed} ${decomposed} ${decomposed} ἀρχή`,
      "t:1",
    );
    expect(t.surface).toBe("ἀρχῇ".normalize("NFC"));
    expect(t.surface).not.toBe(decomposed);
  });

  it.each([
    ["040101 N- ----NSM- λόγος λόγος λόγος", /t:9: expected 7 .* got 6/],
    ["040101 N- ----NSM- λόγος λόγος λόγος λόγος extra", /got 8/],
    ["040101  ----NSM- λόγος λόγος λόγος λόγος", /empty field/],
    ["04011 N- ----NSM- λόγος λόγος λόγος λόγος", /malformed reference "04011"/],
    ["280101 N- ----NSM- λόγος λόγος λόγος λόγος", /out of range/],
    ["040001 N- ----NSM- λόγος λόγος λόγος λόγος", /out of range/],
    ["040101 Q- ----NSM- λόγος λόγος λόγος λόγος", /part-of-speech code "Q-"/],
    ["040101 N- ----NSMX λόγος λόγος λόγος λόγος", /degree code "X"/],
    ["040101 N- ----NS- λόγος λόγος λόγος λόγος", /must be 8 characters/],
  ])("rejects %s", (line, message) => {
    expect(() => parseMorphgntLine(line, "t:9")).toThrow(IngestError);
    expect(() => parseMorphgntLine(line, "t:9")).toThrow(message);
  });
});

describe("parseMorphgntFile", () => {
  const file = [
    "040101 P- -------- Ἐν Ἐν ἐν ἐν",
    "040101 N- ----DSF- ἀρχῇ ἀρχῇ ἀρχῇ ἀρχή",
    "040102 RD ----NSM- οὗτος οὗτος οὗτος οὗτος",
    "",
  ].join("\n");

  it("numbers tokens from 1 within each verse", () => {
    const tokens = parseMorphgntFile(file, "Jn", 4);
    expect(tokens.map((t) => [t.verse, t.position])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
    ]);
  });

  it("rejects lines from another book", () => {
    expect(() => parseMorphgntFile(file, "Jn", 3)).toThrow(/Jn:1: book 4 in the file for book 3/);
  });

  it("rejects verses out of order", () => {
    const swapped = "040102 C- -------- καὶ καὶ καί καί\n040101 C- -------- καὶ καὶ καί καί\n";
    expect(() => parseMorphgntFile(swapped, "Jn", 4)).toThrow(/Jn:2: verse out of order/);
  });

  it("rejects blank lines inside the file", () => {
    expect(() => parseMorphgntFile("040101 C- -------- καὶ καὶ καί καί\n\n", "Jn", 4)).toThrow(
      /Jn:2: expected 7/,
    );
  });

  it("rejects an empty file", () => {
    expect(() => parseMorphgntFile("", "Jn", 4)).toThrow(/file is empty/);
  });
});
