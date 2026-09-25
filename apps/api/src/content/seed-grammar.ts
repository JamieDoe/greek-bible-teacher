import { tokenMatcherSchema } from "@gbt/shared";
import { and, asc, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  grammarConceptExamples,
  grammarConceptRules,
  grammarConcepts,
  tokens,
  verses,
} from "../db/schema";
import { IngestError } from "../ingest/errors";
import type { GrammarConceptContent } from "./grammar/types";

/** Temporary offset so reordering never collides with the unique curriculum order. */
const REORDER_OFFSET = 100_000;

/**
 * Resolves each example to a token id: the n-th token in the verse whose word or normalised
 * form equals `word` (NFC). Throws if any example can't be found.
 */
async function resolveExamples(db: Db, concepts: GrammarConceptContent[]) {
  const resolved = new Map<string, number[]>();
  for (const concept of concepts) {
    const ids: number[] = [];
    for (const ex of concept.examples) {
      const word = ex.word.normalize("NFC");
      const rows = await db
        .select({ id: tokens.id })
        .from(tokens)
        .innerJoin(verses, eq(verses.id, tokens.verseId))
        .where(and(eq(verses.ref, ex.ref), or(eq(tokens.word, word), eq(tokens.normalized, word))))
        .orderBy(asc(tokens.position));
      const token = rows[(ex.occurrence ?? 1) - 1];
      if (!token) {
        throw new IngestError(
          `Grammar "${concept.slug}": example "${word}" (#${ex.occurrence ?? 1}) not found in ${ex.ref}`,
        );
      }
      if (ids.includes(token.id)) {
        throw new IngestError(`Grammar "${concept.slug}": duplicate example ${ex.ref} "${word}"`);
      }
      ids.push(token.id);
    }
    resolved.set(concept.slug, ids);
  }
  return resolved;
}

function validate(concepts: GrammarConceptContent[]) {
  const slugs = new Set<string>();
  for (const c of concepts) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug)) throw new IngestError(`Bad slug "${c.slug}"`);
    if (slugs.has(c.slug)) throw new IngestError(`Duplicate slug "${c.slug}"`);
    slugs.add(c.slug);
    if (!c.title.trim() || !c.summarySimple.trim() || !c.body.trim()) {
      throw new IngestError(`Grammar "${c.slug}": title, summary and body are required`);
    }
    for (const rule of c.rules) {
      const parsed = tokenMatcherSchema.safeParse(rule.match);
      if (!parsed.success) {
        throw new IngestError(`Grammar "${c.slug}": invalid matcher ${JSON.stringify(rule.match)}`);
      }
      if (!rule.note.trim()) throw new IngestError(`Grammar "${c.slug}": rule note is empty`);
    }
  }
}

/**
 * Upserts the curriculum by slug, in list order, replacing each concept's rules and examples.
 * Idempotent. Refuses to run if the DB holds concepts that are no longer in the content.
 */
export async function seedGrammar(db: Db, concepts: GrammarConceptContent[]): Promise<number> {
  validate(concepts);
  const examples = await resolveExamples(db, concepts);
  const slugs = concepts.map((c) => c.slug);

  return db.transaction(async (tx) => {
    const orphans = await tx
      .select({ slug: grammarConcepts.slug })
      .from(grammarConcepts)
      .where(slugs.length ? notInArray(grammarConcepts.slug, slugs) : undefined);
    if (orphans.length > 0) {
      throw new IngestError(
        `Concepts in the DB but not in the content: ${orphans.map((o) => o.slug).join(", ")}`,
      );
    }

    await tx
      .update(grammarConcepts)
      .set({ curriculumOrder: sql`${grammarConcepts.curriculumOrder} + ${REORDER_OFFSET}` });

    for (const [i, c] of concepts.entries()) {
      const values = {
        slug: c.slug,
        curriculumOrder: i + 1,
        title: c.title,
        summarySimple: c.summarySimple.trim(),
        body: c.body.trim(),
        terminologyLevel: c.terminologyLevel ?? ("expanded" as const),
      };
      const [row] = await tx
        .insert(grammarConcepts)
        .values(values)
        .onConflictDoUpdate({ target: grammarConcepts.slug, set: values })
        .returning({ id: grammarConcepts.id });
      const conceptId = row!.id;

      await tx.delete(grammarConceptRules).where(eq(grammarConceptRules.conceptId, conceptId));
      await tx
        .delete(grammarConceptExamples)
        .where(eq(grammarConceptExamples.conceptId, conceptId));
      if (c.rules.length > 0) {
        await tx
          .insert(grammarConceptRules)
          .values(c.rules.map((r) => ({ conceptId, match: r.match, note: r.note.trim() })));
      }
      const tokenIds = examples.get(c.slug) ?? [];
      if (tokenIds.length > 0) {
        await tx
          .insert(grammarConceptExamples)
          .values(
            tokenIds.map((tokenId, position) => ({ conceptId, tokenId, position: position + 1 })),
          );
      }
    }

    const [check] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(grammarConcepts)
      .where(inArray(grammarConcepts.slug, slugs));
    if (check?.n !== concepts.length) throw new IngestError("Grammar seed count mismatch");
    return concepts.length;
  });
}
