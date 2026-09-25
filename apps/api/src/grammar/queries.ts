import type {
  GrammarConceptResponse,
  GrammarConceptSummary,
  GrammarProgressStatus,
} from "@gbt/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { grammarConceptExamples, grammarConcepts, tokens, userGrammarProgress } from "../db/schema";
import { verseSnippet } from "../reading/verse-snippet";

const summaryColumns = {
  slug: grammarConcepts.slug,
  title: grammarConcepts.title,
  curriculumOrder: grammarConcepts.curriculumOrder,
  summarySimple: grammarConcepts.summarySimple,
};

export function listConcepts(db: Db): Promise<GrammarConceptSummary[]> {
  return db
    .select(summaryColumns)
    .from(grammarConcepts)
    .orderBy(asc(grammarConcepts.curriculumOrder));
}

export async function getConcept(
  db: Db,
  slug: string,
): Promise<GrammarConceptResponse["concept"] | null> {
  const [concept] = await db
    .select({
      id: grammarConcepts.id,
      ...summaryColumns,
      body: grammarConcepts.body,
      terminologyLevel: grammarConcepts.terminologyLevel,
      paradigm: grammarConcepts.paradigm,
      quickCheck: grammarConcepts.quickCheck,
    })
    .from(grammarConcepts)
    .where(eq(grammarConcepts.slug, slug));
  if (!concept) return null;

  const exampleRows = await db
    .select({ tokenId: tokens.id, verseId: tokens.verseId })
    .from(grammarConceptExamples)
    .innerJoin(tokens, eq(tokens.id, grammarConceptExamples.tokenId))
    .where(eq(grammarConceptExamples.conceptId, concept.id))
    .orderBy(asc(grammarConceptExamples.position));
  const examples = await Promise.all(
    exampleRows.map(async (e) => ({
      tokenId: e.tokenId,
      ...(await verseSnippet(db, e.verseId, e.tokenId)),
    })),
  );

  const neighbour = async (order: number) => {
    const [row] = await db
      .select({ slug: grammarConcepts.slug, title: grammarConcepts.title })
      .from(grammarConcepts)
      .where(eq(grammarConcepts.curriculumOrder, order));
    return row ?? null;
  };

  const { id: _id, ...rest } = concept;
  return {
    ...rest,
    examples,
    previous: await neighbour(concept.curriculumOrder - 1),
    next: await neighbour(concept.curriculumOrder + 1),
  };
}

export async function conceptIdBySlug(db: Db, slug: string): Promise<number | null> {
  const [row] = await db
    .select({ id: grammarConcepts.id })
    .from(grammarConcepts)
    .where(eq(grammarConcepts.slug, slug));
  return row?.id ?? null;
}

export function listProgress(db: Db, userId: string) {
  return db
    .select({
      slug: grammarConcepts.slug,
      status: userGrammarProgress.status,
      studiedAt: userGrammarProgress.studiedAt,
    })
    .from(userGrammarProgress)
    .innerJoin(grammarConcepts, eq(grammarConcepts.id, userGrammarProgress.conceptId))
    .where(eq(userGrammarProgress.userId, userId))
    .orderBy(asc(grammarConcepts.curriculumOrder));
}

/**
 * Records progress on a concept. Status only moves forward (introduced → studied); the first
 * time it is studied is kept.
 */
export async function recordProgress(
  db: Db,
  {
    userId,
    conceptId,
    status,
    now,
  }: { userId: string; conceptId: number; status: GrammarProgressStatus; now: Date },
) {
  const studiedAt = status === "studied" ? now : null;
  await db
    .insert(userGrammarProgress)
    .values({ userId, conceptId, status, studiedAt })
    .onConflictDoUpdate({
      target: [userGrammarProgress.userId, userGrammarProgress.conceptId],
      set: {
        status: sql`case when ${userGrammarProgress.status} = 'studied' then 'studied'::grammar_progress_status else excluded.status end`,
        studiedAt: sql`coalesce(${userGrammarProgress.studiedAt}, excluded.studied_at)`,
      },
    });
  const [row] = await db
    .select({ status: userGrammarProgress.status, studiedAt: userGrammarProgress.studiedAt })
    .from(userGrammarProgress)
    .where(
      and(eq(userGrammarProgress.userId, userId), eq(userGrammarProgress.conceptId, conceptId)),
    );
  return row!;
}
