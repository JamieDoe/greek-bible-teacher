// Scholarly (SBL-style) transliteration for learners: λόγος → lógos, ἀρχή → archḗ.
// η and ω take a macron; rough breathing is h (ῥ → rh); γ before γ κ ξ χ is n; υ is y except in
// diphthongs (au, eu, ēu, ou, ui); an iota subscript is written as i. The stressed vowel keeps
// an acute, as the design shows it, whatever the Greek accent (acute, grave or circumflex).

const ACUTE = "́";
const MARKS = /[̀́͂̓̔̈̄̆ͅ]/g;

const LETTERS: Record<string, string> = {
  α: "a",
  β: "b",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "ē",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  φ: "ph",
  χ: "ch",
  ψ: "ps",
  ω: "ō",
};
const VOWELS = "αεηιουω";
const DIPHTHONGS = new Set(["αι", "ει", "οι", "υι", "αυ", "ευ", "ηυ", "ου"]);

interface Letter {
  base: string; // lower-case letter without marks
  upper: boolean;
  rough: boolean;
  stressed: boolean;
  subscript: boolean;
  diaeresis: boolean;
}

function letters(word: string): Letter[] {
  const out: Letter[] = [];
  for (const ch of word.normalize("NFD")) {
    if (/\p{Mn}/u.test(ch)) {
      const l = out.at(-1);
      if (!l) continue;
      if (ch === "̔") l.rough = true;
      else if (ch === "́" || ch === "̀" || ch === "͂") l.stressed = true;
      else if (ch === "ͅ") l.subscript = true;
      else if (ch === "̈") l.diaeresis = true;
      continue;
    }
    const lower = ch.toLowerCase();
    out.push({
      base: lower,
      upper: ch !== lower,
      rough: false,
      stressed: false,
      subscript: false,
      diaeresis: false,
    });
  }
  return out;
}

/** One Greek word (or phrase) in Latin letters; anything that isn't Greek passes through. */
export function transliterate(text: string): string {
  return text.replace(/[\p{Script=Greek}\p{Mn}]+/gu, transliterateWord).normalize("NFC");
}

function transliterateWord(word: string): string {
  const ls = letters(word);
  let out = "";
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]!;
    const next = ls[i + 1];
    let latin = LETTERS[l.base];
    if (latin === undefined) {
      out += l.base; // not a Greek letter: keep as is
      continue;
    }
    let stressed = l.stressed;
    let rough = l.rough;
    // Diphthongs are written as one unit; the breathing and accent sit on the second vowel.
    if (
      VOWELS.includes(l.base) &&
      next &&
      DIPHTHONGS.has(l.base + next.base) &&
      !next.diaeresis &&
      !l.stressed
    ) {
      latin = (l.base === "η" ? "ē" : LETTERS[l.base]!) + (next.base === "υ" ? "u" : "i");
      if (l.base === "υ") latin = "ui";
      stressed = next.stressed;
      rough = rough || next.rough;
      i++;
    } else if (l.base === "γ" && next && "γκξχ".includes(next.base)) {
      latin = "n";
    } else if (l.base === "ρ" && rough) {
      latin = "rh";
      rough = false;
    }
    // The accent goes on the last vowel written (a diphthong's second: kaí, Iēsoús).
    if (stressed) latin = latin.replace(/[aeiouyēō](?!.*[aeiouyēō])/, (v) => v + ACUTE);
    if (l.subscript) latin += "i";
    if (rough) latin = "h" + latin;
    if (l.upper) latin = latin.charAt(0).toUpperCase() + latin.slice(1);
    out += latin;
  }
  return out;
}

/** Greek with every diacritic removed, lower case (for comparing endings). */
export function bareGreek(text: string): string {
  return text.normalize("NFD").replace(MARKS, "").toLowerCase().replace(/ς/g, "σ");
}
