import { describe, expect, it } from "vitest";
import {
  decodeMorphology,
  formatMorphology,
  MorphologyDecodeError,
  morphologyLabels,
} from "./decode";

const nothing = {
  person: null,
  tense: null,
  voice: null,
  mood: null,
  case: null,
  number: null,
  gender: null,
  degree: null,
};

describe("decodeMorphology: part of speech", () => {
  it.each([
    ["A-", "adjective"],
    ["C-", "conjunction"],
    ["D-", "adverb"],
    ["I-", "interjection"],
    ["N-", "noun"],
    ["P-", "preposition"],
    ["RA", "article"],
    ["RD", "demonstrative_pronoun"],
    ["RI", "interrogative_indefinite_pronoun"],
    ["RP", "personal_pronoun"],
    ["RR", "relative_pronoun"],
    ["V-", "verb"],
    ["X-", "particle"],
  ])("%s → %s", (code, pos) => {
    expect(decodeMorphology(code, "--------")).toEqual({ partOfSpeech: pos, ...nothing });
  });
});

describe("decodeMorphology: every parse-code value, by position", () => {
  // Each case sets one position and leaves the others as "-".
  const cases: [number, string, keyof typeof nothing, string][] = [
    [0, "1", "person", "first"],
    [0, "2", "person", "second"],
    [0, "3", "person", "third"],
    [1, "P", "tense", "present"],
    [1, "I", "tense", "imperfect"],
    [1, "F", "tense", "future"],
    [1, "A", "tense", "aorist"],
    [1, "X", "tense", "perfect"],
    [1, "Y", "tense", "pluperfect"],
    [2, "A", "voice", "active"],
    [2, "M", "voice", "middle"],
    [2, "P", "voice", "passive"],
    [3, "I", "mood", "indicative"],
    [3, "D", "mood", "imperative"],
    [3, "S", "mood", "subjunctive"],
    [3, "O", "mood", "optative"],
    [3, "N", "mood", "infinitive"],
    [3, "P", "mood", "participle"],
    [4, "N", "case", "nominative"],
    [4, "G", "case", "genitive"],
    [4, "D", "case", "dative"],
    [4, "A", "case", "accusative"],
    [4, "V", "case", "vocative"],
    [5, "S", "number", "singular"],
    [5, "P", "number", "plural"],
    [6, "M", "gender", "masculine"],
    [6, "F", "gender", "feminine"],
    [6, "N", "gender", "neuter"],
    [7, "C", "degree", "comparative"],
    [7, "S", "degree", "superlative"],
  ];
  it.each(cases)("position %i code %s → %s %s", (index, ch, field, value) => {
    const code = "--------".slice(0, index) + ch + "--------".slice(index + 1);
    expect(decodeMorphology("V-", code)).toEqual({
      partOfSpeech: "verb",
      ...nothing,
      [field]: value,
    });
  });
});

describe("decodeMorphology: real John 1:1 analyses", () => {
  it("ἀρχῇ N- ----DSF-", () => {
    expect(decodeMorphology("N-", "----DSF-")).toEqual({
      ...nothing,
      partOfSpeech: "noun",
      case: "dative",
      number: "singular",
      gender: "feminine",
    });
  });

  it("ἦν V- 3IAI-S--", () => {
    expect(decodeMorphology("V-", "3IAI-S--")).toEqual({
      ...nothing,
      partOfSpeech: "verb",
      person: "third",
      tense: "imperfect",
      voice: "active",
      mood: "indicative",
      number: "singular",
    });
  });

  it("τὸν RA ----ASM-", () => {
    expect(decodeMorphology("RA", "----ASM-")).toMatchObject({
      partOfSpeech: "article",
      case: "accusative",
      number: "singular",
      gender: "masculine",
    });
  });
});

describe("decodeMorphology: malformed input fails loudly", () => {
  it.each([
    ["ZZ", "--------", /part-of-speech code "ZZ"/],
    ["N-", "----DSF", /must be 8 characters/],
    ["N-", "----DSF--", /must be 8 characters/],
    ["N-", "----QSF-", /case code "Q" at position 5/],
    ["V-", "4-------", /person code "4" at position 1/],
    ["V-", "-B------", /tense code "B"/],
    ["A-", "-------X", /degree code "X"/],
  ])("%s %s", (pos, parse, message) => {
    expect(() => decodeMorphology(pos, parse)).toThrow(MorphologyDecodeError);
    expect(() => decodeMorphology(pos, parse)).toThrow(message);
  });
});

describe("labels", () => {
  it("formats a noun as in the reader's expanded view", () => {
    expect(formatMorphology(decodeMorphology("N-", "----DSF-"))).toBe(
      "Noun · Dative · Singular · Feminine",
    );
  });

  it("orders verb features tense, voice, mood, person, number", () => {
    expect(morphologyLabels(decodeMorphology("V-", "3IAI-S--"))).toEqual([
      "Verb",
      "Imperfect",
      "Active",
      "Indicative",
      "3rd person",
      "Singular",
    ]);
  });

  it("includes case, number and gender for participles", () => {
    expect(formatMorphology(decodeMorphology("V-", "-PAPNSM-"))).toBe(
      "Verb · Present · Active · Participle · Nominative · Singular · Masculine",
    );
  });

  it("labels indeclinables with just the part of speech", () => {
    expect(formatMorphology(decodeMorphology("C-", "--------"))).toBe("Conjunction");
  });
});
