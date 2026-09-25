import { articleAndCase } from "./article-and-case";
import { alphabet, breathingsAccents } from "./foundations";
import {
  connectors,
  demonstratives,
  eimi,
  negation,
  personalPronouns,
  prepositions,
  relativePronouns,
} from "./function-words";
import { adjectives, dative, genderNumber, genitive } from "./nouns";
import { practice } from "./practice";
import type { GrammarConceptContent } from "./types";
import {
  imperative,
  infinitives,
  participlesAdjectival,
  participlesAdverbial,
  subjunctive,
  wordOrder,
} from "./verb-forms";
import { aorist, future, imperfect, middlePassive, perfect, present } from "./verbs";

/**
 * The grammar curriculum, in teaching order: what John 1:1–5 needs first, then what the next
 * curated passages need (see DECISIONS 017 for the reasoning).
 */
const curriculum: GrammarConceptContent[] = [
  alphabet,
  breathingsAccents,
  articleAndCase,
  eimi,
  connectors,
  prepositions,
  dative,
  genitive,
  genderNumber,
  personalPronouns,
  demonstratives,
  negation,
  aorist,
  present,
  imperfect,
  perfect,
  middlePassive,
  relativePronouns,
  adjectives,
  future,
  infinitives,
  participlesAdjectival,
  participlesAdverbial,
  subjunctive,
  imperative,
  wordOrder,
];

/** The curriculum with each concept's practice (paradigm table and quick check) attached. */
export const grammarContent: GrammarConceptContent[] = curriculum.map((c) => ({
  ...c,
  ...practice[c.slug],
}));
