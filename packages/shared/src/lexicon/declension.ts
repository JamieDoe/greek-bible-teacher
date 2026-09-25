import { bareGreek } from "./transliterate";

export type Declension = 1 | 2 | 3;
export type NounGender = "masculine" | "feminine" | "neuter";

/**
 * A noun's declension, derived: the lexicon doesn't record it. The genitive singular decides
 * when the text has one (-ου → 2nd, or 1st for a masculine in -ης/-ας; -ης/-ας → 1st;
 * -ος/-ους/-ως → 3rd); otherwise only unambiguous dictionary endings do. Anything uncertain is
 * null, so the app shows no chip rather than a wrong one.
 */
export function nounDeclension(
  lemma: string,
  gender: NounGender | null,
  genitiveSingular: string | null,
): Declension | null {
  const lem = bareGreek(lemma);
  if (genitiveSingular) {
    const gen = bareGreek(genitiveSingular);
    if (gen.endsWith("ου")) return /(ησ|ασ)$/.test(lem) ? 1 : 2;
    if (/(ησ|ασ)$/.test(gen)) return 1;
    if (/(οσ|ουσ|ωσ)$/.test(gen)) return 3;
    return null;
  }
  if (gender === "feminine" && /[αη]$/.test(lem)) return 1;
  if (gender === "neuter" && lem.endsWith("ον")) return 2;
  if ((gender === "masculine" || gender === "feminine") && lem.endsWith("οσ")) return 2;
  return null;
}

export const DECLENSION_LABELS: Record<Declension, string> = {
  1: "1st declension",
  2: "2nd declension",
  3: "3rd declension",
};
