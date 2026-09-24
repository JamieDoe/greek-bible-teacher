import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  smallint,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { grammarConcepts, passages } from "./curriculum";
import {
  disclosureLevelEnum,
  experienceLevelEnum,
  grammarProgressStatusEnum,
  reviewContextEnum,
  reviewGradeEnum,
} from "./enums";
import { lemmas } from "./lexicon";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

/** Anonymous until auth exists; auth will attach to this same row. No personal data. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    experienceLevel: experienceLevelEnum("experience_level"),
    dailyMinutes: smallint("daily_minutes"),
    onboardedAt: timestamptz("onboarded_at"),
    disclosureLevel: disclosureLevelEnum("disclosure_level").notNull().default("beginner"),
  },
  (t) => [
    check(
      "users_daily_minutes_range",
      sql`${t.dailyMinutes} is null or ${t.dailyMinutes} between 1 and 240`,
    ),
  ],
);

const userId = () =>
  uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

/**
 * Scheduler state per word. SRS fields are null until the first graded review; a row can exist
 * earlier because reading lookups are recorded too.
 */
export const userWordProgress = pgTable(
  "user_word_progress",
  {
    userId: userId(),
    lemmaId: integer("lemma_id")
      .notNull()
      .references(() => lemmas.id),
    correctCount: integer("correct_count").notNull().default(0),
    incorrectCount: integer("incorrect_count").notNull().default(0),
    difficulty: real("difficulty"),
    stability: real("stability"),
    intervalDays: real("interval_days"),
    nextReviewAt: timestamptz("next_review_at"),
    lastReviewedAt: timestamptz("last_reviewed_at"),
    lookupsCount: integer("lookups_count").notNull().default(0),
    firstSeenAt: timestamptz("first_seen_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.lemmaId] }),
    index("user_word_progress_due_idx").on(t.userId, t.nextReviewAt),
    check(
      "user_word_progress_counts_nonneg",
      sql`${t.correctCount} >= 0 and ${t.incorrectCount} >= 0 and ${t.lookupsCount} >= 0`,
    ),
    check(
      "user_word_progress_interval_nonneg",
      sql`${t.intervalDays} is null or ${t.intervalDays} >= 0`,
    ),
  ],
);

export const userGrammarProgress = pgTable(
  "user_grammar_progress",
  {
    userId: userId(),
    conceptId: integer("concept_id")
      .notNull()
      .references(() => grammarConcepts.id),
    status: grammarProgressStatusEnum("status").notNull(),
    studiedAt: timestamptz("studied_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.conceptId] })],
);

export const userReadingProgress = pgTable(
  "user_reading_progress",
  {
    userId: userId(),
    passageId: integer("passage_id")
      .notNull()
      .references(() => passages.id),
    timesRead: integer("times_read").notNull().default(0),
    completedAt: timestamptz("completed_at"),
    lastReadAt: timestamptz("last_read_at"),
    tokensLookedUp: integer("tokens_looked_up").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.passageId] }),
    check(
      "user_reading_progress_counts_nonneg",
      sql`${t.timesRead} >= 0 and ${t.tokensLookedUp} >= 0`,
    ),
  ],
);

/** Append-only log of graded reviews; kept so FSRS can be fitted later. */
export const reviewEvents = pgTable(
  "review_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    userId: userId(),
    lemmaId: integer("lemma_id")
      .notNull()
      .references(() => lemmas.id),
    grade: reviewGradeEnum("grade").notNull(),
    reviewedAt: timestamptz("reviewed_at").notNull().defaultNow(),
    context: reviewContextEnum("context").notNull(),
  },
  (t) => [index("review_events_user_reviewed_idx").on(t.userId, t.reviewedAt)],
);
