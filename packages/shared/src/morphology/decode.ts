import type {
  Degree,
  Gender,
  GrammaticalCase,
  GrammaticalNumber,
  Mood,
  PartOfSpeech,
  Person,
  Tense,
  Voice,
} from "./categories";

/** Structured morphology for one MorphGNT analysis. Absent features are null. */
export interface DecodedMorphology {
  partOfSpeech: PartOfSpeech;
  person: Person | null;
  tense: Tense | null;
  voice: Voice | null;
  mood: Mood | null;
  case: GrammaticalCase | null;
  number: GrammaticalNumber | null;
  gender: Gender | null;
  degree: Degree | null;
}

export class MorphologyDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MorphologyDecodeError";
  }
}

// Code tables from the MorphGNT sblgnt README. "V" (vocative) is absent from the README's case
// list but occurs in the data.
const POS_CODES: Record<string, PartOfSpeech> = {
  "A-": "adjective",
  "C-": "conjunction",
  "D-": "adverb",
  "I-": "interjection",
  "N-": "noun",
  "P-": "preposition",
  RA: "article",
  RD: "demonstrative_pronoun",
  RI: "interrogative_indefinite_pronoun",
  RP: "personal_pronoun",
  RR: "relative_pronoun",
  "V-": "verb",
  "X-": "particle",
};

const PERSON: Record<string, Person> = { "1": "first", "2": "second", "3": "third" };
const TENSE: Record<string, Tense> = {
  P: "present",
  I: "imperfect",
  F: "future",
  A: "aorist",
  X: "perfect",
  Y: "pluperfect",
};
const VOICE: Record<string, Voice> = { A: "active", M: "middle", P: "passive" };
const MOOD: Record<string, Mood> = {
  I: "indicative",
  D: "imperative",
  S: "subjunctive",
  O: "optative",
  N: "infinitive",
  P: "participle",
};
const CASE: Record<string, GrammaticalCase> = {
  N: "nominative",
  G: "genitive",
  D: "dative",
  A: "accusative",
  V: "vocative",
};
const NUMBER: Record<string, GrammaticalNumber> = { S: "singular", P: "plural" };
const GENDER: Record<string, Gender> = { M: "masculine", F: "feminine", N: "neuter" };
const DEGREE: Record<string, Degree> = { C: "comparative", S: "superlative" };

/**
 * Decodes a MorphGNT part-of-speech code (e.g. `N-`) and 8-character parse code
 * (e.g. `----DSF-`). Throws MorphologyDecodeError on any unknown or malformed code.
 */
export function decodeMorphology(posCode: string, parseCode: string): DecodedMorphology {
  const partOfSpeech = POS_CODES[posCode];
  if (!partOfSpeech) throw new MorphologyDecodeError(`Unknown part-of-speech code "${posCode}"`);
  if (parseCode.length !== 8) {
    throw new MorphologyDecodeError(`Parse code "${parseCode}" must be 8 characters`);
  }

  function at<T extends string>(index: number, field: string, table: Record<string, T>): T | null {
    const ch = parseCode.charAt(index);
    if (ch === "-") return null;
    const value = table[ch];
    if (!value) {
      throw new MorphologyDecodeError(
        `Unknown ${field} code "${ch}" at position ${index + 1} of "${parseCode}"`,
      );
    }
    return value;
  }

  return {
    partOfSpeech,
    person: at(0, "person", PERSON),
    tense: at(1, "tense", TENSE),
    voice: at(2, "voice", VOICE),
    mood: at(3, "mood", MOOD),
    case: at(4, "case", CASE),
    number: at(5, "number", NUMBER),
    gender: at(6, "gender", GENDER),
    degree: at(7, "degree", DEGREE),
  };
}

const POS_LABEL: Record<PartOfSpeech, string> = {
  adjective: "Adjective",
  conjunction: "Conjunction",
  adverb: "Adverb",
  interjection: "Interjection",
  noun: "Noun",
  preposition: "Preposition",
  article: "Article",
  demonstrative_pronoun: "Demonstrative pronoun",
  interrogative_indefinite_pronoun: "Interrogative/indefinite pronoun",
  personal_pronoun: "Personal pronoun",
  relative_pronoun: "Relative pronoun",
  verb: "Verb",
  particle: "Particle",
};
const PERSON_LABEL: Record<Person, string> = {
  first: "1st person",
  second: "2nd person",
  third: "3rd person",
};

/** Display name for a part of speech, e.g. "Personal pronoun". */
export const partOfSpeechLabel = (pos: PartOfSpeech): string => POS_LABEL[pos];

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Human-readable labels in reading order, e.g. `["Noun", "Dative", "Singular", "Feminine"]` or
 * `["Verb", "Imperfect", "Active", "Indicative", "3rd person", "Singular"]`.
 */
export function morphologyLabels(m: DecodedMorphology): string[] {
  const labels = [POS_LABEL[m.partOfSpeech]];
  for (const value of [m.tense, m.voice, m.mood]) if (value) labels.push(capitalise(value));
  if (m.person) labels.push(PERSON_LABEL[m.person]);
  for (const value of [m.case, m.number, m.gender, m.degree])
    if (value) labels.push(capitalise(value));
  return labels;
}

/** Labels joined for display, e.g. "Noun · Dative · Singular · Feminine". */
export function formatMorphology(m: DecodedMorphology): string {
  return morphologyLabels(m).join(" · ");
}
