import { describe, expect, it } from "vitest";
import { bareGreek, transliterate } from "./transliterate";

const nfc = (s: string) => s.normalize("NFC");

describe("transliterate", () => {
  it.each([
    ["λόγος", "lógos"],
    ["θεός", "theós"],
    ["ἀρχή", "archḗ"],
    ["ζωή", "zōḗ"],
    ["φῶς", "phṓs"],
    ["σκοτία", "skotía"],
    ["καί", "kaí"], // diphthong: the accent sits on its second vowel
    ["οὐρανός", "ouranós"],
    ["εὐαγγέλιον", "euangélion"], // γγ → ng
    ["ἄγκυρα", "ánkyra"], // γκ → nk; υ outside a diphthong → y
    ["ὁ", "ho"], // rough breathing
    ["υἱός", "huiós"], // rough breathing on a diphthong
    ["ῥῆμα", "rhḗma"], // initial ῥ → rh
    ["ἀρχῇ", "archḗi"], // iota subscript → i
    ["Ἰησοῦς", "Iēsoús"],
    ["Μωϋσῆς", "Mōysḗs"], // diaeresis: no diphthong
    ["ψυχή", "psychḗ"],
    ["ἐν ἀρχῇ", "en archḗi"],
  ])("%s → %s", (greek, latin) => {
    expect(transliterate(greek)).toBe(nfc(latin));
  });
});

describe("bareGreek", () => {
  it("drops every diacritic and lowers the case", () => {
    expect(bareGreek("Ἀρχῇ")).toBe("αρχη");
    expect(bareGreek("λόγος")).toBe("λογοσ");
  });
});
