import {
  degrees,
  disclosureLevels,
  experienceLevels,
  genders,
  grammarProgressStatuses,
  grammaticalCases,
  grammaticalNumbers,
  lessonItemKinds,
  moods,
  partsOfSpeech,
  persons,
  reviewContexts,
  reviewGrades,
  tenses,
  testaments,
  voices,
} from "@gbt/shared";
import { pgEnum } from "drizzle-orm/pg-core";

// Value lists live in @gbt/shared so the DB, decoder and API cannot drift apart.

export const testamentEnum = pgEnum("testament", testaments);

export const partOfSpeechEnum = pgEnum("part_of_speech", partsOfSpeech);
export const personEnum = pgEnum("person", persons);
export const tenseEnum = pgEnum("tense", tenses);
export const voiceEnum = pgEnum("voice", voices);
export const moodEnum = pgEnum("mood", moods);
export const caseEnum = pgEnum("grammatical_case", grammaticalCases);
export const numberEnum = pgEnum("grammatical_number", grammaticalNumbers);
export const genderEnum = pgEnum("gender", genders);
export const degreeEnum = pgEnum("degree", degrees);

export const experienceLevelEnum = pgEnum("experience_level", experienceLevels);
export const disclosureLevelEnum = pgEnum("disclosure_level", disclosureLevels);
export const reviewGradeEnum = pgEnum("review_grade", reviewGrades);
export const reviewContextEnum = pgEnum("review_context", reviewContexts);
export const lessonItemKindEnum = pgEnum("lesson_item_kind", lessonItemKinds);
export const grammarProgressStatusEnum = pgEnum("grammar_progress_status", grammarProgressStatuses);
