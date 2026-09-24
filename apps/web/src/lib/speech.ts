// Pronunciation audio through the browser's Web Speech API and the device's Greek voice.
// Device voices speak Modern Greek; lessons teach Erasmian, so the UI labels audio as
// "Modern Greek voice" (DECISIONS 021).

/** The minimal voice shape we need (SpeechSynthesisVoice satisfies it). */
export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

/**
 * The best Greek voice available: el-GR first, then any `el` variant; on-device voices are
 * preferred (they work offline), then the platform default. Null if there is none.
 */
export function findGreekVoice<V extends VoiceLike>(voices: readonly V[]): V | null {
  const greek = voices.filter((v) => /^el(-|_|$)/i.test(v.lang));
  if (greek.length === 0) return null;
  const score = (v: V) =>
    (/^el[-_]GR$/i.test(v.lang) ? 4 : 0) + (v.localService ? 2 : 0) + (v.default ? 1 : 0);
  return [...greek].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0]!;
}

// Combining marks in decomposed (NFD) polytonic Greek.
const PSILI = "̓"; // smooth breathing
const DASIA = "̔"; // rough breathing
const GRAVE = "̀";
const ACUTE = "́";
const PERISPOMENI = "͂"; // circumflex
const YPOGEGRAMMENI = "ͅ"; // iota subscript
const MACRON = "̄";
const BREVE = "̆";

/**
 * Converts polytonic text to the monotonic spelling Modern Greek voices expect: breathings,
 * iota subscripts, length marks and apparatus sigla go; grave and circumflex become the one
 * stress accent (tonos); diaeresis stays. Text keeps its punctuation, so voices still pause.
 */
export function speakableText(text: string): string {
  return text
    .replace(/[⸀⸁⸂⸃⸄⸅]\d?/g, "")
    .normalize("NFD")
    .replaceAll(PSILI, "")
    .replaceAll(DASIA, "")
    .replaceAll(YPOGEGRAMMENI, "")
    .replaceAll(MACRON, "")
    .replaceAll(BREVE, "")
    .replaceAll(GRAVE, ACUTE)
    .replaceAll(PERISPOMENI, ACUTE)
    .normalize("NFC");
}
