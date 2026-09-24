import { sql } from "drizzle-orm";
import { grammarConceptRules, lemmas, morphology } from "../db/schema";

/**
 * A token's features as JSONB, with keys mirroring TokenMatcher. Use in a query that joins
 * `lemmas` and `morphology` for the token. Null features are dropped so they never match.
 */
export const tokenFeatures = sql`jsonb_strip_nulls(jsonb_build_object(
  'lemma', ${lemmas.lemma},
  'partOfSpeech', ${morphology.partOfSpeech}::text,
  'person', ${morphology.person}::text,
  'tense', ${morphology.tense}::text,
  'voice', ${morphology.voice}::text,
  'mood', ${morphology.mood}::text,
  'case', ${morphology.case}::text,
  'number', ${morphology.number}::text,
  'gender', ${morphology.gender}::text,
  'degree', ${morphology.degree}::text))`;

/** Join condition: the rule's matcher is contained in the token's features. */
export const ruleMatchesToken = sql`${grammarConceptRules.match} <@ ${tokenFeatures}`;

/** Most specific first: rules naming the word itself, then rules with more features. */
export const ruleSpecificity = [
  sql`${grammarConceptRules.match} ? 'lemma' desc`,
  sql`(select count(*) from jsonb_object_keys(${grammarConceptRules.match})) desc`,
];
