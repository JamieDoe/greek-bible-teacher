import { describe, expect, it } from "vitest";
import { speakableText } from "./speakable";

describe("speakableText", () => {
  it.each([
    ["ἀρχῇ", "αρχή"], // smooth breathing and iota subscript dropped, circumflex → tonos
    ["θεὸς", "θεός"], // grave → tonos
    ["Ἐν", "Εν"],
    ["αὐτῷ", "αυτώ"],
    ["σκοτίᾳ", "σκοτία"],
    ["Μωϋσῆς", "Μωϋσής"], // diaeresis kept
    ["δι’ αὐτοῦ", "δι’ αυτού"],
    ["υἱός", "υιός"], // υι is one syllable, so two in all: keeps its accent
    ["θεοῦ", "θεού"],
    ["δύο", "δύο"],
  ])("%s → %s", (polytonic, monotonic) => {
    expect(speakableText(polytonic)).toBe(monotonic.normalize("NFC"));
  });

  it.each([
    ["ἦν", "ήν"],
    ["καὶ", "καί"],
    ["πρὸς τὸν", "πρός τόν"],
    ["ὁ", "ο"],
    ["ἢ", "ή"],
  ])("one-syllable words keep their accent: %s → %s", (polytonic, monotonic) => {
    expect(speakableText(polytonic)).toBe(monotonic.normalize("NFC"));
  });

  it.each([
    ["ὄνομά μου", "όνομα μου"], // the enclitic's extra accent goes
    ["ἄνθρωπός τις", "άνθρωπος τις"],
    ["Ἆρά γε", "Άρα γε"],
  ])("keeps only a word's first accent: %s → %s", (polytonic, monotonic) => {
    expect(speakableText(polytonic)).toBe(monotonic.normalize("NFC"));
  });

  it("reads John 1:1 as the voice comparison preferred", () => {
    expect(
      speakableText("Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος."),
    ).toBe("Εν αρχή ήν ο λόγος, καί ο λόγος ήν πρός τόν θεόν, καί θεός ήν ο λόγος.");
  });

  it("keeps punctuation so the voice pauses, and drops apparatus sigla", () => {
    expect(speakableText("ὁ λόγος, καὶ ⸀αὐτοῦ.")).toBe("ο λόγος, καί αυτού.");
  });

  it("handles already-decomposed input", () => {
    expect(speakableText("ἀρχῇ".normalize("NFD"))).toBe("αρχή");
  });
});
