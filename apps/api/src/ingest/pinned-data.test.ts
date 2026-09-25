import { decodeMorphology, splitSurface } from "@gbt/shared";
import { beforeAll, describe, expect, it } from "vitest";
import type { ImportInput } from "./import-nt";
import { loadSources } from "./load";

// Parses the real, checksum-pinned files in data/. Counts are for MorphGNT sblgnt @ aaed91e;
// if the pin changes, update them deliberately.
const TOKENS_PER_BOOK: Record<string, number> = {
  MAT: 18329,
  MRK: 11286,
  LUK: 19446,
  JHN: 15438,
  ACT: 18412,
  ROM: 7055,
  "1CO": 6812,
  "2CO": 4473,
  GAL: 2226,
  EPH: 2416,
  PHP: 1626,
  COL: 1580,
  "1TH": 1473,
  "2TH": 820,
  "1TI": 1591,
  "2TI": 1235,
  TIT: 659,
  PHM: 334,
  HEB: 4935,
  JAS: 1739,
  "1PE": 1678,
  "2PE": 1098,
  "1JN": 2137,
  "2JN": 245,
  "3JN": 219,
  JUD: 459,
  REV: 9833,
};

let input: ImportInput;
beforeAll(async () => {
  input = await loadSources();
});

describe("pinned MorphGNT SBLGNT", () => {
  it("has the expected token count for every book", () => {
    const counts = Object.fromEntries(input.books.map((b) => [b.book.abbrev, b.tokens.length]));
    expect(counts).toEqual(TOKENS_PER_BOOK);
  });

  it("has 7,927 verses, 5,461 lemmas and 602 distinct analyses", () => {
    const all = input.books.flatMap((b) => b.tokens.map((t) => ({ ...t, abbrev: b.book.abbrev })));
    expect(new Set(all.map((t) => `${t.abbrev} ${t.chapter}:${t.verse}`)).size).toBe(7927);
    expect(new Set(all.map((t) => t.lemma)).size).toBe(5461);
    expect(new Set(all.map((t) => `${t.posCode} ${t.parseCode}`)).size).toBe(602);
  });

  it("decodes every analysis that occurs, including vocatives and adverb degrees", () => {
    const all = input.books.flatMap((b) => b.tokens);
    const decoded = all.map((t) => decodeMorphology(t.posCode, t.parseCode));
    expect(decoded.filter((d) => d.case === "vocative").length).toBe(668);
    expect(decoded.some((d) => d.partOfSpeech === "adverb" && d.degree === "comparative")).toBe(
      true,
    );
  });

  it("is NFC throughout, so surface text is stored byte-for-byte as published", () => {
    for (const t of input.books.flatMap((b) => b.tokens)) {
      for (const field of [t.surface, t.word, t.normalized, t.lemma]) {
        expect(field.normalize("NFC")).toBe(field);
      }
    }
  });

  it("parses John 1:1 exactly", () => {
    const john = input.books.find((b) => b.book.abbrev === "JHN")!;
    const verse = john.tokens.filter((t) => t.chapter === 1 && t.verse === 1);
    expect(verse.map((t) => [t.position, t.surface, t.lemma, t.posCode, t.parseCode])).toEqual([
      [1, "Ἐν", "ἐν", "P-", "--------"],
      [2, "ἀρχῇ", "ἀρχή", "N-", "----DSF-"],
      [3, "ἦν", "εἰμί", "V-", "3IAI-S--"],
      [4, "ὁ", "ὁ", "RA", "----NSM-"],
      [5, "λόγος,", "λόγος", "N-", "----NSM-"],
      [6, "καὶ", "καί", "C-", "--------"],
      [7, "ὁ", "ὁ", "RA", "----NSM-"],
      [8, "λόγος", "λόγος", "N-", "----NSM-"],
      [9, "ἦν", "εἰμί", "V-", "3IAI-S--"],
      [10, "πρὸς", "πρός", "P-", "--------"],
      [11, "τὸν", "ὁ", "RA", "----ASM-"],
      [12, "θεόν,", "θεός", "N-", "----ASM-"],
      [13, "καὶ", "καί", "C-", "--------"],
      [14, "θεὸς", "θεός", "N-", "----NSM-"],
      [15, "ἦν", "εἰμί", "V-", "3IAI-S--"],
      [16, "ὁ", "ὁ", "RA", "----NSM-"],
      [17, "λόγος.", "λόγος", "N-", "----NSM-"],
    ]);
  });
});

describe("pinned Dodson lexicon", () => {
  it("parses all 5,407 headwords and glosses the slice vocabulary", () => {
    expect(input.lexicon.size).toBe(5407);
    for (const lemma of ["λόγος", "θεός", "ἀρχή", "καί", "εἰμί"]) {
      expect(input.lexicon.get(lemma)?.brief, lemma).toBeTruthy();
    }
  });
});

describe("reader punctuation split on the real text", () => {
  it("rebuilds every surface from before + word + after, minus apparatus sigla only", () => {
    for (const t of input.books.flatMap((b) => b.tokens)) {
      const { before, after } = splitSurface(t.surface, t.word);
      expect(before + t.word + after).toBe(t.surface.replace(/[⸀⸁⸂⸃⸄⸅]\d?/g, ""));
    }
  });
});
