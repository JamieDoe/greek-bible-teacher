import { describe, expect, it } from "vitest";
import { clipFileName, CLIP_FILE, type PlanToken, planClips, type VoiceSettings } from "./plan";

const tok = (verseRef: string, position: number, surface: string, word: string, lemma: string) =>
  ({ verseRef, position, surface, word, lemma }) satisfies PlanToken;

// John 1:1a–b, out of order, as rows might arrive.
const tokens = [
  tok("JHN 1:1", 3, "ὁ", "ὁ", "ὁ"),
  tok("JHN 1:1", 1, "Ἐν", "Ἐν", "ἐν"),
  tok("JHN 1:1", 2, "ἀρχῇ", "ἀρχῇ", "ἀρχή"),
  tok("JHN 1:1", 4, "λόγος,", "λόγος", "λόγος"),
  tok("JHN 1:2", 1, "οὗτος", "οὗτος", "οὗτος"),
];

describe("planClips", () => {
  const clips = planClips(tokens);

  it("records each verse in reading order, with punctuation, in the voice's spelling", () => {
    expect(clips.filter((c) => c.kind === "verse")).toEqual([
      { kind: "verse", key: "JHN 1:1", text: "Εν αρχή ο λόγος," },
      { kind: "verse", key: "JHN 1:2", text: "ούτος" },
    ]);
  });

  it("records every word form and dictionary form once, keyed by what is spoken", () => {
    const words = clips.filter((c) => c.kind === "word").map((c) => c.key);
    // ἀρχῇ (form) and ἀρχή (lemma) are both "αρχή" when spoken; Ἐν and ἐν are both "εν".
    expect(words).toEqual(["αρχή", "εν", "λόγος", "ο", "ούτος"]);
    expect(clips.filter((c) => c.kind === "word").every((c) => c.key === c.text)).toBe(true);
  });
});

describe("clipFileName", () => {
  const settings: VoiceSettings = {
    voiceId: "v1",
    model: "eleven_v3",
    outputFormat: "mp3_44100_128",
    languageCode: "el",
    seed: 7,
  };

  it("is stable for the same text and settings", () => {
    const name = clipFileName(settings, "λόγος");
    expect(name).toMatch(CLIP_FILE);
    expect(clipFileName({ ...settings }, "λόγος")).toBe(name);
  });

  it("changes with the text or any voice setting, so old audio is never reused", () => {
    const name = clipFileName(settings, "λόγος");
    expect(clipFileName(settings, "θεός")).not.toBe(name);
    expect(clipFileName({ ...settings, voiceId: "v2" }, "λόγος")).not.toBe(name);
    expect(clipFileName({ ...settings, model: "eleven_multilingual_v2" }, "λόγος")).not.toBe(name);
    expect(clipFileName({ ...settings, seed: 8 }, "λόγος")).not.toBe(name);
  });
});
