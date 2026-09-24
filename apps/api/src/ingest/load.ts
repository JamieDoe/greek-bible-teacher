import { parseDodson } from "./dodson";
import type { ImportInput } from "./import-nt";
import { readLock, readPinnedFile } from "./data-files";
import { IngestError } from "./errors";
import { parseMorphgntFile } from "./morphgnt";
import { ntBooks } from "./nt-books";

/** Reads and parses every pinned source file, verifying checksums first. */
export async function loadSources(): Promise<ImportInput> {
  const lock = await readLock();
  const morphgnt = lock.sources["morphgnt-sblgnt"]?.commit;
  const dodson = lock.sources["dodson"]?.commit;
  if (!morphgnt || !dodson) throw new IngestError("sources.lock.json is missing a source commit");

  const books = await Promise.all(
    ntBooks.map(async (book) => {
      const text = await readPinnedFile(lock, `morphgnt-sblgnt/${book.file}`);
      return { book, tokens: parseMorphgntFile(text, book.file, book.order) };
    }),
  );
  const tokenCount = books.reduce((n, b) => n + b.tokens.length, 0);
  if (books.length !== 27 || tokenCount === 0) {
    throw new IngestError(
      `Expected 27 non-empty books, got ${books.length} (${tokenCount} tokens)`,
    );
  }
  const lexicon = parseDodson(await readPinnedFile(lock, "dodson/dodson.xml"));
  return { books, lexicon, commits: { morphgnt, dodson } };
}
