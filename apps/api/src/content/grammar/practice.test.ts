import { beforeAll, describe, expect, it } from "vitest";
import { loadSources } from "../../ingest/load";
import { grammarContent } from ".";
import { practice } from "./practice";

const GREEK_WORD = /[\p{Script=Greek}\p{Mn}]+/gu;
/** Greek words of a text, ignoring the [brackets] that mark the changed part. */
const greekWords = (text: string) => text.replace(/[[\]]/g, "").match(GREEK_WORD) ?? [];
/** Compare forms without case or accent differences (the grave is only positional). */
const key = (w: string) => w.normalize("NFD").replace(/̀/g, "́").normalize("NFC").toLowerCase();

describe("grammar practice content", () => {
  it("gives every concept a quick check, and nothing to unknown concepts", () => {
    const slugs = grammarContent.map((c) => c.slug);
    expect(Object.keys(practice).sort()).toEqual([...slugs].sort());
    for (const c of grammarContent) expect(c.quickCheck, c.slug).toBeDefined();
  });

  it.each(grammarContent.map((c) => [c.slug, c] as const))("%s is well formed", (_, c) => {
    const q = c.quickCheck!;
    expect(q.question.trim()).not.toBe("");
    expect(q.options.length).toBeGreaterThanOrEqual(2);
    expect(q.options.length).toBeLessThanOrEqual(4);
    expect(new Set(q.options).size).toBe(q.options.length);
    expect(q.answer).toBeGreaterThanOrEqual(0);
    expect(q.answer).toBeLessThan(q.options.length);
    expect(q.explanation.trim()).not.toBe("");
    for (const row of c.paradigm?.rows ?? []) {
      // Brackets pair up, never nest, and never enclose nothing.
      expect(row.to, row.to).toMatch(/^[^[\]]*(\[[^[\]]+\][^[\]]*)*$/);
      expect(row.from).not.toMatch(/[[\]]/);
    }
  });

  describe("every Greek form it teaches occurs in the NT", () => {
    let attested: Set<string>;
    beforeAll(async () => {
      const { books } = await loadSources();
      attested = new Set(books.flatMap((b) => b.tokens.map((t) => key(t.word))));
    }, 60_000);

    it.each(grammarContent.map((c) => [c.slug, c] as const))("%s", (_, c) => {
      const texts = [
        ...c.quickCheck!.options,
        ...(c.paradigm?.rows.flatMap((r) => [r.from, r.to]) ?? []),
      ];
      // Single letters (the alphabet check) aren't words.
      const words = texts.flatMap(greekWords).filter((w) => [...w].length > 1);
      const missing = words.filter((w) => !attested.has(key(w)));
      expect(missing, `not found in the NT: ${missing.join(", ")}`).toEqual([]);
    });
  });
});
