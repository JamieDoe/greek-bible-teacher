import {
  buildChoices,
  chooseExerciseType,
  type PartOfSpeech,
  pickDistractors,
  type ReviewItem,
  type Rng,
  selectNewVocabulary,
  splitSurface,
  stageMaxRank,
  type VocabularyCandidate,
} from "@gbt/shared";
import { and, asc, count, eq, gte, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../db/client";
import {
  chapters,
  books,
  lemmas,
  passages,
  tokens,
  userReadingProgress,
  userWordProgress,
  verses,
} from "../db/schema";

/** Most items in one review session, and most new words among them. */
export const QUEUE_LIMIT = 20;
export const NEW_PER_SESSION = 5;
/** Candidates for distractors: nearest in frequency among the same part of speech. */
const DISTRACTOR_POOL = 12;

const startVerse = alias(verses, "start_verse");
const endVerse = alias(verses, "end_verse");

type QueueKind = ReviewItem["kind"];

/** Builds the session: due words first, then new words chosen by `selectNewVocabulary`. */
export async function buildReviewQueue(
  db: Db,
  { userId, now, rng, lemmaIds }: { userId: string; now: Date; rng: Rng; lemmaIds?: number[] },
): Promise<{ items: ReviewItem[]; dueCount: number }> {
  const [due] = await db
    .select({ n: count() })
    .from(userWordProgress)
    .where(and(eq(userWordProgress.userId, userId), lte(userWordProgress.nextReviewAt, now)));
  const dueCount = due?.n ?? 0;

  let plan: { lemmaId: number; kind: QueueKind }[];
  if (lemmaIds) {
    plan = lemmaIds.slice(0, QUEUE_LIMIT).map((lemmaId) => ({ lemmaId, kind: "lookedUp" }));
  } else {
    const dueRows = await db
      .select({ lemmaId: userWordProgress.lemmaId })
      .from(userWordProgress)
      .where(and(eq(userWordProgress.userId, userId), lte(userWordProgress.nextReviewAt, now)))
      .orderBy(asc(userWordProgress.nextReviewAt), asc(userWordProgress.lemmaId))
      .limit(QUEUE_LIMIT);
    const newLimit = Math.min(NEW_PER_SESSION, QUEUE_LIMIT - dueRows.length);
    const newIds = newLimit > 0 ? await chooseNewWords(db, userId, newLimit) : [];
    plan = [
      ...dueRows.map((r) => ({ lemmaId: r.lemmaId, kind: "due" as const })),
      ...newIds.map((lemmaId) => ({ lemmaId, kind: "new" as const })),
    ];
  }

  const items: ReviewItem[] = [];
  for (const entry of plan) {
    const item = await buildItem(db, userId, entry, rng);
    if (item) items.push(item);
  }
  return { items, dueCount };
}

/** The first curated passage the learner hasn't completed (or the last one, if all are done). */
async function currentPassage(db: Db, userId: string) {
  const rows = await db
    .select({
      id: passages.id,
      startOrdinal: startVerse.ordinal,
      endOrdinal: endVerse.ordinal,
      completedAt: userReadingProgress.completedAt,
    })
    .from(passages)
    .innerJoin(startVerse, eq(startVerse.id, passages.startVerseId))
    .innerJoin(endVerse, eq(endVerse.id, passages.endVerseId))
    .leftJoin(
      userReadingProgress,
      and(eq(userReadingProgress.passageId, passages.id), eq(userReadingProgress.userId, userId)),
    )
    .where(isNotNull(passages.curriculumOrder))
    .orderBy(asc(passages.curriculumOrder));
  return rows.find((r) => r.completedAt === null) ?? rows.at(-1) ?? null;
}

async function chooseNewWords(db: Db, userId: string, limit: number): Promise<number[]> {
  const [known] = await db
    .select({ n: count() })
    .from(userWordProgress)
    .where(and(eq(userWordProgress.userId, userId), gte(userWordProgress.intervalDays, 1)));
  const knownCount = known?.n ?? 0;
  const passage = await currentPassage(db, userId);

  // Candidate pool: current-passage lemmas, stage-appropriate frequent lemmas, and any lemma the
  // learner has touched (for struggle signals). The pure selector does the ranking.
  const ranked = db.$with("ranked").as(
    db
      .select({
        id: lemmas.id,
        ntFrequency: lemmas.ntFrequency,
        hasGloss: sql<boolean>`${lemmas.gloss} is not null`.as("has_gloss"),
        rank: sql<number>`row_number() over (order by ${lemmas.ntFrequency} desc, ${lemmas.id})`
          .mapWith(Number)
          .as("rank"),
      })
      .from(lemmas),
  );
  const passageLemmas = passage
    ? sql`(select t.lemma_id from ${tokens} t join ${verses} v on v.id = t.verse_id
          where v.ordinal between ${passage.startOrdinal} and ${passage.endOrdinal})`
    : sql`(select null::int where false)`;

  const rows = await db
    .with(ranked)
    .select({
      lemmaId: ranked.id,
      ntFrequency: ranked.ntFrequency,
      rank: ranked.rank,
      hasGloss: ranked.hasGloss,
      inPassage: sql<boolean>`${ranked.id} in ${passageLemmas}`,
      scheduled: sql<boolean>`${userWordProgress.nextReviewAt} is not null`,
      lookupsCount: sql<number>`coalesce(${userWordProgress.lookupsCount}, 0)`.mapWith(Number),
      correctCount: sql<number>`coalesce(${userWordProgress.correctCount}, 0)`.mapWith(Number),
      incorrectCount: sql<number>`coalesce(${userWordProgress.incorrectCount}, 0)`.mapWith(Number),
    })
    .from(ranked)
    .leftJoin(
      userWordProgress,
      and(eq(userWordProgress.lemmaId, ranked.id), eq(userWordProgress.userId, userId)),
    )
    .where(
      sql`${ranked.id} in ${passageLemmas}
        or ${ranked.rank} <= ${stageMaxRank(knownCount)}
        or ${userWordProgress.userId} is not null`,
    );

  const candidates: VocabularyCandidate[] = rows.map((r) => ({
    lemmaId: r.lemmaId,
    ntFrequency: r.ntFrequency,
    frequencyRank: r.rank,
    inCurrentPassage: r.inPassage,
    scheduled: r.scheduled,
    hasGloss: r.hasGloss,
    lookupsCount: r.lookupsCount,
    correctCount: r.correctCount,
    incorrectCount: r.incorrectCount,
  }));
  return selectNewVocabulary(candidates, { limit, knownCount });
}

async function buildItem(
  db: Db,
  userId: string,
  { lemmaId, kind }: { lemmaId: number; kind: QueueKind },
  rng: Rng,
): Promise<ReviewItem | null> {
  const [lemma] = await db
    .select({
      lemma: lemmas.lemma,
      gloss: lemmas.gloss,
      partOfSpeech: lemmas.partOfSpeech,
      ntFrequency: lemmas.ntFrequency,
      correctCount: userWordProgress.correctCount,
    })
    .from(lemmas)
    .leftJoin(
      userWordProgress,
      and(eq(userWordProgress.lemmaId, lemmas.id), eq(userWordProgress.userId, userId)),
    )
    .where(eq(lemmas.id, lemmaId));
  if (!lemma || lemma.gloss === null) return null; // unknown or unglossed: can't be quizzed

  const context = await contextFor(db, lemmaId);
  const type = chooseExerciseType({
    correctCount: lemma.correctCount ?? 0,
    hasContext: context !== null,
  });

  // Distractors from the same part of speech; words like the article (the only lemma of its
  // kind) top up from any part of speech, still nearest in frequency.
  const target = { lemmaId, gloss: lemma.gloss, ntFrequency: lemma.ntFrequency };
  const samePos = await distractorCandidates(db, lemmaId, lemma.ntFrequency, lemma.partOfSpeech);
  let distractors = pickDistractors(target, samePos, { count: 3, pool: DISTRACTOR_POOL, rng });
  if (distractors.length < 3) {
    const anyPos = await distractorCandidates(db, lemmaId, lemma.ntFrequency, undefined);
    distractors = [
      ...distractors,
      ...pickDistractors(target, anyPos, {
        count: 3 - distractors.length,
        pool: DISTRACTOR_POOL,
        rng,
        exclude: distractors.map((d) => d.gloss),
      }),
    ];
  }
  const { options, answerIndex } = buildChoices(
    lemma.gloss,
    distractors.map((d) => d.gloss),
    rng,
  );

  return {
    lemmaId,
    kind,
    lemma: {
      lemma: lemma.lemma,
      gloss: lemma.gloss,
      partOfSpeech: lemma.partOfSpeech,
      ntFrequency: lemma.ntFrequency,
    },
    exercise: { type, context: type === "context" ? context : null, options, answerIndex },
  };
}

/** Glossed lemmas nearest in NT frequency (log scale), optionally of one part of speech. */
function distractorCandidates(
  db: Db,
  lemmaId: number,
  ntFrequency: number,
  partOfSpeech: PartOfSpeech | null | undefined,
) {
  return db
    .select({
      lemmaId: lemmas.id,
      gloss: sql<string>`${lemmas.gloss}`,
      ntFrequency: lemmas.ntFrequency,
    })
    .from(lemmas)
    .where(
      and(
        ne(lemmas.id, lemmaId),
        isNotNull(lemmas.gloss),
        partOfSpeech === undefined
          ? undefined
          : partOfSpeech === null
            ? sql`${lemmas.partOfSpeech} is null`
            : eq(lemmas.partOfSpeech, partOfSpeech),
      ),
    )
    .orderBy(
      sql`abs(ln(greatest(${lemmas.ntFrequency}, 1)) - ln(greatest(${ntFrequency}, 1)))`,
      asc(lemmas.id),
    )
    .limit(DISTRACTOR_POOL * 2);
}

/**
 * A verse showing the word in use: its first occurrence in a curated passage (in curriculum
 * order), otherwise its first occurrence in the NT.
 */
async function contextFor(db: Db, lemmaId: number) {
  const [inPassage] = await db
    .select({ tokenId: tokens.id, verseId: tokens.verseId })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(passages, isNotNull(passages.curriculumOrder))
    .innerJoin(startVerse, eq(startVerse.id, passages.startVerseId))
    .innerJoin(endVerse, eq(endVerse.id, passages.endVerseId))
    .where(
      and(
        eq(tokens.lemmaId, lemmaId),
        sql`${verses.ordinal} between ${startVerse.ordinal} and ${endVerse.ordinal}`,
      ),
    )
    .orderBy(asc(passages.curriculumOrder), asc(verses.ordinal), asc(tokens.position))
    .limit(1);
  const [anywhere] = inPassage
    ? [inPassage]
    : await db
        .select({ tokenId: tokens.id, verseId: tokens.verseId })
        .from(tokens)
        .innerJoin(verses, eq(verses.id, tokens.verseId))
        .where(eq(tokens.lemmaId, lemmaId))
        .orderBy(asc(verses.ordinal), asc(tokens.position))
        .limit(1);
  if (!anywhere) return null;

  const verseTokens = await db
    .select({
      id: tokens.id,
      surface: tokens.surface,
      word: tokens.word,
      displayRef: sql<string>`${books.name} || ' ' || ${chapters.number} || ':' || ${verses.number}`,
    })
    .from(tokens)
    .innerJoin(verses, eq(verses.id, tokens.verseId))
    .innerJoin(chapters, eq(chapters.id, verses.chapterId))
    .innerJoin(books, eq(books.id, chapters.bookId))
    .where(inArray(tokens.verseId, [anywhere.verseId]))
    .orderBy(asc(tokens.position));

  return {
    displayRef: verseTokens[0]?.displayRef ?? "",
    tokens: verseTokens.map((t) => ({
      ...splitSurface(t.surface, t.word),
      word: t.word,
      isTarget: t.id === anywhere.tokenId,
    })),
  };
}
