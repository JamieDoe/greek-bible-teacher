import { describe, expect, it } from "vitest";
import { findGreekVoice, speakableText } from "./speech";

describe("speakableText", () => {
  it.each([
    ["ἀρχῇ", "αρχή"], // smooth breathing and iota subscript dropped, circumflex → tonos
    ["ἦν", "ήν"],
    ["ὁ", "ο"], // rough breathing dropped
    ["καὶ", "καί"], // grave → tonos
    ["τὸν θεόν", "τόν θεόν"],
    ["Ἐν", "Εν"],
    ["αὐτῷ", "αυτώ"],
    ["σκοτίᾳ", "σκοτία"],
    ["Μωϋσῆς", "Μωϋσής"], // diaeresis kept
    ["δι’ αὐτοῦ", "δι’ αυτού"],
  ])("%s → %s", (polytonic, monotonic) => {
    expect(speakableText(polytonic)).toBe(monotonic.normalize("NFC"));
  });

  it("keeps punctuation so the voice pauses, and drops apparatus sigla", () => {
    expect(speakableText("ὁ λόγος, καὶ ⸀αὐτοῦ.")).toBe("ο λόγος, καί αυτού.");
  });

  it("handles already-decomposed input", () => {
    expect(speakableText("ἀρχῇ".normalize("NFD"))).toBe("αρχή");
  });
});

describe("findGreekVoice", () => {
  const v = (name: string, lang: string, extra: object = {}) => ({ name, lang, ...extra });

  it("returns null when the device has no Greek voice", () => {
    expect(findGreekVoice([v("Samantha", "en-US"), v("Thomas", "fr-FR")])).toBeNull();
  });

  it("prefers el-GR, then on-device, then default", () => {
    const voices = [
      v("Online Greek", "el-GR", { localService: false }),
      v("Cypriot", "el-CY", { localService: true }),
      v("Melina", "el-GR", { localService: true }),
      v("English", "en-GB", { default: true }),
    ];
    expect(findGreekVoice(voices)?.name).toBe("Melina");
  });

  it("accepts underscore and bare language codes", () => {
    expect(findGreekVoice([v("A", "el_GR")])?.name).toBe("A");
    expect(findGreekVoice([v("B", "el")])?.name).toBe("B");
    expect(findGreekVoice([v("C", "ell")])).toBeNull();
  });
});
