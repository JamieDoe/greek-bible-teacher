import { inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { passages, verses } from "../db/schema";
import { IngestError } from "../ingest/errors";
import type { PassageContent } from "./passages";

/**
 * Upserts curated passages by verse range. Requires the NT to be ingested; fails loudly if a
 * referenced verse is missing or a range runs backwards. Idempotent.
 */
export async function seedPassages(db: Db, content: PassageContent[]): Promise<number> {
  const refs = content.flatMap((p) => [p.startRef, p.endRef]);
  const found = await db
    .select({ id: verses.id, ref: verses.ref, ordinal: verses.ordinal })
    .from(verses)
    .where(inArray(verses.ref, refs));
  const byRef = new Map(found.map((v) => [v.ref, v]));

  return db.transaction(async (tx) => {
    for (const p of content) {
      const start = byRef.get(p.startRef);
      const end = byRef.get(p.endRef);
      if (!start || !end) {
        throw new IngestError(
          `Passage "${p.title}": verse ${!start ? p.startRef : p.endRef} not found; run \`pnpm ingest\` first`,
        );
      }
      if (start.ordinal > end.ordinal) throw new IngestError(`Passage "${p.title}" runs backwards`);
      await tx
        .insert(passages)
        .values({
          title: p.title,
          startVerseId: start.id,
          endVerseId: end.id,
          curriculumOrder: p.curriculumOrder,
        })
        .onConflictDoUpdate({
          target: [passages.startVerseId, passages.endVerseId],
          set: { title: sql`excluded.title`, curriculumOrder: sql`excluded.curriculum_order` },
        });
    }
    return content.length;
  });
}
