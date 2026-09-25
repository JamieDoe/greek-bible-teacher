import { createHash } from "node:crypto";
import { speakableText, spokenWordKey } from "@gbt/shared";

/** One token of a curated passage, as the generator reads it from the database. */
export interface PlanToken {
  verseRef: string;
  position: number;
  surface: string;
  word: string;
  lemma: string;
}

export interface Clip {
  kind: "word" | "verse";
  /** Manifest key: the spoken form for words, the reference ("JHN 1:1") for verses. */
  key: string;
  /** Exactly what is sent to the voice. */
  text: string;
}

/**
 * Everything the lessons can play: each verse of the curated passages, and every word form and
 * dictionary form in them (the word sheet says the form, a new-word card the lemma). Words are
 * keyed by their spoken form, so repeats (and capitalised repeats) are recorded once.
 */
export function planClips(tokens: readonly PlanToken[]): Clip[] {
  const verses = new Map<string, PlanToken[]>();
  const words = new Set<string>();
  for (const t of tokens) {
    verses.set(t.verseRef, [...(verses.get(t.verseRef) ?? []), t]);
    words.add(spokenWordKey(t.word));
    words.add(spokenWordKey(t.lemma));
  }
  const verseClips: Clip[] = [...verses].map(([ref, ts]) => ({
    kind: "verse",
    key: ref,
    text: speakableText(
      [...ts]
        .sort((a, b) => a.position - b.position)
        .map((t) => t.surface)
        .join(" "),
    ),
  }));
  const wordClips: Clip[] = [...words]
    .sort((a, b) => a.localeCompare(b, "el"))
    .map((w) => ({ kind: "word", key: w, text: w }));
  return [...wordClips, ...verseClips];
}

/** Everything that changes how a clip sounds. */
export interface VoiceSettings {
  voiceId: string;
  model: string;
  outputFormat: string;
  languageCode: string;
  seed: number;
}

/**
 * A clip's file name, derived from its text and the voice settings: changing either gives a new
 * file, so stale audio is never served under a current name.
 */
export function clipFileName(settings: VoiceSettings, text: string): string {
  const { voiceId, model, outputFormat, languageCode, seed } = settings;
  const hash = createHash("sha256")
    .update(JSON.stringify([voiceId, model, outputFormat, languageCode, seed, text]))
    .digest("hex");
  return `${hash.slice(0, 16)}.mp3`;
}

export const CLIP_FILE = /^[0-9a-f]{16}\.mp3$/;
