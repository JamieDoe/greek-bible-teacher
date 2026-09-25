import { describe, expect, it } from "vitest";
import { nounDeclension } from "./declension";

describe("nounDeclension", () => {
  it.each([
    ["λόγος", "masculine", "λόγου", 2],
    ["ὁδός", "feminine", "ὁδοῦ", 2], // feminine, still 2nd
    ["ἔργον", "neuter", "ἔργου", 2],
    ["ζωή", "feminine", "ζωῆς", 1],
    ["ἡμέρα", "feminine", "ἡμέρας", 1],
    ["μαθητής", "masculine", "μαθητοῦ", 1], // masculine 1st: genitive in -ου
    ["νεανίας", "masculine", "νεανίου", 1],
    ["φῶς", "neuter", "φωτός", 3],
    ["ἔθνος", "neuter", "ἔθνους", 3], // neuter in -ος is 3rd
    ["πόλις", "feminine", "πόλεως", 3],
    ["πνεῦμα", "neuter", "πνεύματος", 3],
  ] as const)("%s (gen. %s) → %s", (lemma, gender, gen, expected) => {
    expect(nounDeclension(lemma, gender, gen)).toBe(expected);
  });

  it("falls back to unambiguous dictionary endings when the text has no genitive", () => {
    expect(nounDeclension("ἀρχή", "feminine", null)).toBe(1);
    expect(nounDeclension("τέκνον", "neuter", null)).toBe(2);
    expect(nounDeclension("θρόνος", "masculine", null)).toBe(2);
  });

  it("says nothing when it can't tell", () => {
    expect(nounDeclension("σκότος", "neuter", null)).toBeNull(); // -ος neuter: 2nd or 3rd?
    expect(nounDeclension("χάρις", "feminine", null)).toBeNull();
    expect(nounDeclension("ἀνήρ", null, null)).toBeNull();
  });
});
