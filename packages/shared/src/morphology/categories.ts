// Grammatical categories used by the morphology decoder (Phase 2) and the DB enums.
// Values follow the MorphGNT README's POS and parse-code lists. "vocative" is not in
// that list but is a real Greek case; the Phase 2 decoder confirms which values occur.

export const partsOfSpeech = [
  "adjective",
  "conjunction",
  "adverb",
  "interjection",
  "noun",
  "preposition",
  "article",
  "demonstrative_pronoun",
  "interrogative_indefinite_pronoun",
  "personal_pronoun",
  "relative_pronoun",
  "verb",
  "particle",
] as const;
export type PartOfSpeech = (typeof partsOfSpeech)[number];

export const persons = ["first", "second", "third"] as const;
export type Person = (typeof persons)[number];

export const tenses = [
  "present",
  "imperfect",
  "future",
  "aorist",
  "perfect",
  "pluperfect",
] as const;
export type Tense = (typeof tenses)[number];

export const voices = ["active", "middle", "passive"] as const;
export type Voice = (typeof voices)[number];

export const moods = [
  "indicative",
  "imperative",
  "subjunctive",
  "optative",
  "infinitive",
  "participle",
] as const;
export type Mood = (typeof moods)[number];

export const grammaticalCases = [
  "nominative",
  "genitive",
  "dative",
  "accusative",
  "vocative",
] as const;
export type GrammaticalCase = (typeof grammaticalCases)[number];

export const grammaticalNumbers = ["singular", "plural"] as const;
export type GrammaticalNumber = (typeof grammaticalNumbers)[number];

export const genders = ["masculine", "feminine", "neuter"] as const;
export type Gender = (typeof genders)[number];

export const degrees = ["comparative", "superlative"] as const;
export type Degree = (typeof degrees)[number];
