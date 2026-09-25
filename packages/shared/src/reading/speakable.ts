// Polytonic → monotonic spelling for Greek speech (the device voice and the pre-generated
// ElevenLabs audio both read this form; DECISIONS 021, 028).

// Combining marks in decomposed (NFD) polytonic Greek.
const PSILI = "̓"; // smooth breathing
const DASIA = "̔"; // rough breathing
const GRAVE = "̀";
const ACUTE = "́";
const PERISPOMENI = "͂"; // circumflex
const YPOGEGRAMMENI = "ͅ"; // iota subscript
const MACRON = "̄";
const BREVE = "̆";

/** A Greek word in decomposed form: letters plus their combining marks. */
const WORD = /[\p{Script=Greek}\p{Mn}]+/gu;

/**
 * Converts polytonic text to the monotonic spelling Modern Greek voices expect: breathings,
 * iota subscripts, length marks and apparatus sigla go; grave and circumflex become the one
 * stress accent (tonos); diaeresis stays; and a word keeps only its first accent. One-syllable
 * words keep their accent (καί, ήν): in a listening comparison ElevenLabs v3 sounded better
 * with it than with strict modern spelling (και, ην). Text keeps its punctuation, so voices
 * still pause.
 */
export function speakableText(text: string): string {
  return text
    .replace(/[⸀⸁⸂⸃⸄⸅]\d?/g, "")
    .normalize("NFD")
    .replace(WORD, monotonicWord)
    .normalize("NFC");
}

/** One decomposed polytonic word → its monotonic spelling (still decomposed). */
function monotonicWord(word: string): string {
  const mono = word
    .replaceAll(PSILI, "")
    .replaceAll(DASIA, "")
    .replaceAll(YPOGEGRAMMENI, "")
    .replaceAll(MACRON, "")
    .replaceAll(BREVE, "")
    .replaceAll(GRAVE, ACUTE)
    .replaceAll(PERISPOMENI, ACUTE);
  // Before an enclitic a word can carry a second accent (ὄνομά μου); modern spelling keeps one.
  const first = mono.indexOf(ACUTE) + 1;
  return first === 0 ? mono : mono.slice(0, first) + mono.slice(first).replaceAll(ACUTE, "");
}
